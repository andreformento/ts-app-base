import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MOBILE_CLIENT,
  WEB_CLIENT,
  type Harness,
  startHarness,
} from './harness.js';
import { call, cookieHeader } from './client.js';

type Auth = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
};
type Failure = { error: { code: string; message: string } };

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 300_000);

afterAll(async () => {
  await harness.stop();
});

beforeEach(async () => {
  await harness.reset();
});

describe('POST /auth/google', () => {
  it('signs in a new person and creates their user', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: WEB_CLIENT,
      name: 'A Person',
    });
    const response = await call<Auth>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('person-1@example.test');
    expect(response.body.accessToken.length).toBeGreaterThan(0);
    expect(response.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('sets httpOnly cookies for a browser while still returning tokens in the body', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: WEB_CLIENT,
    });
    const response = await call<Auth>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });

    const access = response.cookies.find((c) => c.startsWith('appname_access='));
    expect(access).toBeDefined();
    expect(access).toContain('HttpOnly');
    expect(response.body.accessToken.length).toBeGreaterThan(0);
  });

  it('accepts the mobile audience with no server change', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: MOBILE_CLIENT,
    });
    const response = await call<Auth>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(201);
  });

  it('returns the same user on a second sign-in', async () => {
    const first = await call<Auth>(harness.url, '/auth/google', {
      method: 'POST',
      body: {
        idToken: await harness.identity.idToken({
          subject: 'person-1',
          audience: WEB_CLIENT,
        }),
      },
    });
    const second = await call<Auth>(harness.url, '/auth/google', {
      method: 'POST',
      body: {
        idToken: await harness.identity.idToken({
          subject: 'person-1',
          audience: WEB_CLIENT,
        }),
      },
    });
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('rejects an audience that is not ours', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: 'someone-elses-client',
    });
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('identity.audience-not-allowed');
  });

  it('rejects a token signed by an unpublished key', async () => {
    const idToken = await harness.identity.foreignToken('person-1', WEB_CLIENT);
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: WEB_CLIENT,
      expiresInSeconds: -60,
    });
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
  });

  it('rejects an unverified email', async () => {
    const idToken = await harness.identity.idToken({
      subject: 'person-1',
      audience: WEB_CLIENT,
      emailVerified: false,
    });
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken },
    });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('identity.email-unverified');
  });

  it('rejects a malformed body at the trust boundary', async () => {
    const response = await call<Failure>(harness.url, '/auth/google', {
      method: 'POST',
      body: { idToken: 42 },
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('request.invalid');
  });
});

describe('GET /auth/me', () => {
  it('accepts a bearer token', async () => {
    const auth = await signIn('person-1');
    const response = await call<{ email: string }>(harness.url, '/auth/me', {
      token: auth.body.accessToken,
    });
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('person-1@example.test');
  });

  it('accepts the cookie envelope, giving the same result', async () => {
    const auth = await signIn('person-1');
    const response = await call<{ email: string }>(harness.url, '/auth/me', {
      cookie: cookieHeader(auth.cookies),
    });
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('person-1@example.test');
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
    const auth = await signIn('person-1');
    const refreshed = await call<Auth>(harness.url, '/auth/refresh', {
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
    expect(replay.body.error.code).toBe('session.revoked');
  });

  it('refuses an unknown refresh token', async () => {
    const response = await call<Failure>(harness.url, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'nonsense' },
    });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('session.unknown');
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session, and the access token stops working immediately', async () => {
    const auth = await signIn('person-1');
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
    expect(after.body.error.code).toBe('session.revoked');
  });

  it('revokes via the cookie envelope alone, as a browser does', async () => {
    const auth = await signIn('person-1');
    const cookie = cookieHeader(auth.cookies);
    expect((await call(harness.url, '/auth/me', { cookie })).status).toBe(200);

    const out = await call(harness.url, '/auth/logout', {
      method: 'POST',
      body: {},
      cookie,
    });
    expect(out.status).toBe(201);

    const after = await call<Failure>(harness.url, '/auth/me', {
      token: auth.body.accessToken,
    });
    expect(after.status).toBe(401);
  });
});

async function signIn(subject: string, audience: string = WEB_CLIENT) {
  const idToken = await harness.identity.idToken({ subject, audience });
  return call<Auth>(harness.url, '/auth/google', {
    method: 'POST',
    body: { idToken },
  });
}
