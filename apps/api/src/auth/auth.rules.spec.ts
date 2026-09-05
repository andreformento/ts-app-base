import { describe, expect, it } from 'vitest';
import {
  REFRESH_COOKIE,
  acceptIdentity,
  acceptSession,
  expiryFrom,
  readRefreshToken,
} from './auth.rules';
import type { Accepted, IdentityClaims } from './auth.rules';

function refusalOf<T, R>(accepted: Accepted<T, R>): R | null {
  return accepted.ok ? null : accepted.refusal;
}

const policy = {
  issuer: 'https://issuer.test',
  audiences: ['web-client', 'mobile-client'],
};
const now = new Date('2026-01-01T00:00:00Z');

function claims(overrides: Partial<IdentityClaims> = {}): IdentityClaims {
  return {
    iss: 'https://issuer.test',
    sub: 'subject-1',
    aud: 'web-client',
    exp: Math.floor(now.getTime() / 1000) + 3600,
    email: 'person@example.test',
    email_verified: true,
    name: 'A Person',
    ...overrides,
  };
}

describe('acceptIdentity', () => {
  it('accepts valid claims', () => {
    expect(acceptIdentity(claims(), policy, now)).toEqual({
      ok: true,
      value: {
        subject: 'subject-1',
        email: 'person@example.test',
        name: 'A Person',
        pictureUrl: null,
      },
    });
  });

  it('accepts any audience on the allowlist, so a second client needs no code', () => {
    expect(
      acceptIdentity(claims({ aud: 'mobile-client' }), policy, now).ok,
    ).toBe(true);
  });

  it('accepts an audience array containing one of ours', () => {
    expect(
      acceptIdentity(claims({ aud: ['other', 'web-client'] }), policy, now).ok,
    ).toBe(true);
  });

  it('refuses a foreign issuer and a foreign audience', () => {
    expect(
      acceptIdentity(claims({ iss: 'https://evil.test' }), policy, now),
    ).toEqual({
      ok: false,
      refusal: 'issuer-mismatch',
    });
    expect(
      acceptIdentity(claims({ aud: 'someone-else' }), policy, now),
    ).toEqual({
      ok: false,
      refusal: 'audience-not-allowed',
    });
  });

  it('refuses expiry at or before the moment asked about', () => {
    const boundary = Math.floor(now.getTime() / 1000);
    expect(
      refusalOf(acceptIdentity(claims({ exp: boundary }), policy, now)),
    ).toBe('expired');
    expect(
      refusalOf(acceptIdentity(claims({ exp: boundary - 1 }), policy, now)),
    ).toBe('expired');
  });

  it('refuses claims whose types are wrong rather than trusting them', () => {
    expect(refusalOf(acceptIdentity(claims({ sub: 42 }), policy, now))).toBe(
      'subject-missing',
    );
    expect(
      refusalOf(acceptIdentity(claims({ exp: 'soon' }), policy, now)),
    ).toBe('expired');
    expect(
      refusalOf(acceptIdentity(claims({ email: null }), policy, now)),
    ).toBe('email-missing');
  });

  it('refuses an unverified email, including a truthy non-true value', () => {
    expect(
      refusalOf(acceptIdentity(claims({ email_verified: false }), policy, now)),
    ).toBe('email-unverified');
    expect(
      refusalOf(
        acceptIdentity(claims({ email_verified: 'true' }), policy, now),
      ),
    ).toBe('email-unverified');
  });

  it('falls back to the email when no name is asserted', () => {
    const accepted = acceptIdentity(claims({ name: undefined }), policy, now);
    expect(accepted.ok && accepted.value.name).toBe('person@example.test');
  });
});

describe('acceptSession', () => {
  const session = {
    id: 'sess-1',
    userId: 'u1',
    expiresAt: new Date(now.getTime() + 1000),
    revokedAt: null,
  };

  it('accepts a live session', () => {
    expect(acceptSession(session, now)).toEqual({ ok: true, value: session });
  });

  it('refuses unknown, revoked and expired sessions', () => {
    expect(refusalOf(acceptSession(null, now))).toBe('unknown');
    expect(
      refusalOf(acceptSession({ ...session, revokedAt: new Date(0) }, now)),
    ).toBe('revoked');
    expect(refusalOf(acceptSession({ ...session, expiresAt: now }, now))).toBe(
      'expired',
    );
  });

  it('treats revocation as decisive even when the session has not expired', () => {
    const revoked = {
      ...session,
      revokedAt: new Date(0),
      expiresAt: new Date(now.getTime() + 1e6),
    };
    expect(refusalOf(acceptSession(revoked, now))).toBe('revoked');
  });
});

describe('expiryFrom', () => {
  it('adds the ttl in seconds', () => {
    expect(expiryFrom(now, 60)).toEqual(new Date('2026-01-01T00:01:00Z'));
  });
});

describe('readRefreshToken', () => {
  it('prefers an explicit body token, as a native client sends it', () => {
    expect(readRefreshToken('body', { [REFRESH_COOKIE]: 'cookie' })).toBe(
      'body',
    );
  });

  it('falls back to the cookie, as a browser sends it', () => {
    expect(readRefreshToken(null, { [REFRESH_COOKIE]: 'cookie' })).toBe(
      'cookie',
    );
    expect(readRefreshToken(undefined, { [REFRESH_COOKIE]: 'cookie' })).toBe(
      'cookie',
    );
    expect(readRefreshToken('', { [REFRESH_COOKIE]: 'cookie' })).toBe('cookie');
  });

  it('returns null when neither carries one', () => {
    expect(readRefreshToken(null, {})).toBe(null);
    expect(readRefreshToken(null, { [REFRESH_COOKIE]: '' })).toBe(null);
  });
});
