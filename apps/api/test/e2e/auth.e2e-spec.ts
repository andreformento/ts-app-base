import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MOBILE_CLIENT, WEB_CLIENT, startHarness } from './harness';
import type { Harness } from './harness';
import { call, cookieHeader } from './client';
import type { Failure, Session } from './responses';

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 300_000);

afterAll(async () => {
  await harness.stop();
});

describe('POST /auth/google', () => {
  it('signs in a new person and creates their user', async () => {
    const subject = randomUUID();
    const idToken = await harness.idToken({
      subject,
      audience: WEB_CLIENT,
      name: 'A Person',
    });
    const response = await call<Session>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(`${subject}@example.test`);
    expect(response.body.accessToken.length).toBeGreaterThan(0);
    expect(response.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('sets httpOnly cookies while still returning tokens in the body', async () => {
    const response = await signIn();
    const access = response.cookies.find((cookie) =>
      cookie.startsWith('appname_access='),
    );
    expect(access).toBeDefined();
    expect(access).toContain('HttpOnly');
  });

  it('accepts the mobile audience with no server change', async () => {
    const subject = randomUUID();
    const idToken = await harness.idToken({
      subject,
      audience: MOBILE_CLIENT,
    });
    const response = await call<Session>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(201);
  });

  it('returns the same user on a second sign-in', async () => {
    const subject = randomUUID();
    const first = await signIn(subject);
    const second = await signIn(subject);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('never exposes the provider subject', async () => {
    const response = await signIn();
    expect(response.body.user).not.toHaveProperty('subject');
  });

  it('refuses an audience that is not ours', async () => {
    const subject = randomUUID();
    const idToken = await harness.idToken({
      subject,
      audience: 'someone-elses-client',
    });
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a token signed by an unpublished key', async () => {
    const idToken = await foreignToken(randomUUID(), WEB_CLIENT);
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
  });

  it('refuses an expired token and an unverified email', async () => {
    const subject = randomUUID();
    const expired = await harness.idToken({
      subject,
      audience: WEB_CLIENT,
      expiresInSeconds: -60,
    });
    expect(
      (
        await call(harness.url, '/auth/google', {
          method: 'POST',
          body: { idToken: expired },
        })
      ).status,
    ).toBe(401);

    const unverified = await harness.idToken({
      subject,
      audience: WEB_CLIENT,
      emailVerified: false,
    });
    expect(
      (
        await call(harness.url, '/auth/google', {
          method: 'POST',
          body: { idToken: unverified },
        })
      ).status,
    ).toBe(401);
  });

  it('refuses a malformed body at the boundary', async () => {
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken: 42 },
    });
    expect(response.status).toBe(400);
  });

  it('refuses a body carrying an undeclared field', async () => {
    const subject = randomUUID();
    const idToken = await harness.idToken({
      subject,
      audience: WEB_CLIENT,
    });
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken, role: 'host' },
    });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('role');
  });
});

describe('GET /auth/me', () => {
  it('accepts either envelope and gives the same answer', async () => {
    const auth = await signIn();

    const bearer = await call<{ email: string }>(harness.url, '/auth/me', {
      token: auth.body.accessToken,
    });
    const cookie = await call<{ email: string }>(harness.url, '/auth/me', {
      cookie: cookieHeader(auth.cookies),
    });

    expect(bearer.status).toBe(200);
    expect(cookie.status).toBe(200);
    expect(bearer.body.email).toBe(cookie.body.email);
  });

  it('refuses an absent or forged token', async () => {
    expect((await call(harness.url, '/auth/me')).status).toBe(401);
    expect(
      (await call(harness.url, '/auth/me', { token: 'not-a-token' })).status,
    ).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('issues a new pair and revokes the presented token', async () => {
    const auth = await signIn();
    const refreshed = await call<Session>(harness.url, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: auth.body.refreshToken },
    });
    expect(refreshed.status).toBe(201);
    expect(refreshed.body.refreshToken).not.toBe(auth.body.refreshToken);

    const replay = await call<Failure>(harness.url, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: auth.body.refreshToken },
    });
    expect(replay.status).toBe(401);
  });

  it('refuses an unknown refresh token', async () => {
    const response = await call<Failure>(harness.url, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'nonsense' },
    });
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session, and the access token stops working at once', async () => {
    const auth = await signIn();
    expect(
      (await call(harness.url, '/auth/me', { token: auth.body.accessToken }))
        .status,
    ).toBe(200);

    await call(harness.url, '/auth/logout', {
      method: 'POST',
      body: { refreshToken: auth.body.refreshToken },
    });

    const after = await call<Failure>(harness.url, '/auth/me', {
      token: auth.body.accessToken,
    });
    expect(after.status).toBe(401);
  });

  it('revokes through the cookie envelope alone, as a browser does', async () => {
    const auth = await signIn();
    const cookie = cookieHeader(auth.cookies);

    const out = await call(harness.url, '/auth/logout', {
      method: 'POST',
      body: {},
      cookie,
    });
    expect(out.status).toBe(201);

    expect(
      (await call(harness.url, '/auth/me', { token: auth.body.accessToken }))
        .status,
    ).toBe(401);
  });
});

async function signIn(
  subject: string = randomUUID(),
  audience: string = WEB_CLIENT,
) {
  const idToken = await harness.idToken({ subject, audience });
  return call<Session>(harness.url, '/auth/google', {
    method: 'POST',
    body: { idToken },
  });
}

async function foreignToken(
  subject: string,
  audience: string,
): Promise<string> {
  const { SignJWT, generateKeyPair } = await import('jose');
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: `${subject}@example.test`, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(subject)
    .setIssuer('https://issuer.test')
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}
