import { describe, expect, it } from 'vitest';
import { acceptIdentity } from './identity.js';
import type { IdentityClaims } from '../model/user.js';

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
    email: 'person@example.com',
    emailVerified: true,
    name: 'A Person',
    picture: null,
    ...overrides,
  };
}

describe('acceptIdentity', () => {
  it('accepts valid claims', () => {
    expect(acceptIdentity(claims(), policy, now)).toEqual({
      ok: true,
      value: {
        subject: 'subject-1',
        email: 'person@example.com',
        name: 'A Person',
        pictureUrl: null,
      },
    });
  });

  it('accepts any audience on the allowlist, so a second client needs no new logic', () => {
    expect(
      acceptIdentity(claims({ aud: 'mobile-client' }), policy, now).ok,
    ).toBe(true);
  });

  it('rejects an audience not on the allowlist', () => {
    expect(
      acceptIdentity(claims({ aud: 'someone-elses-client' }), policy, now),
    ).toEqual({
      ok: false,
      error: { kind: 'audience-not-allowed' },
    });
  });

  it('rejects a foreign issuer', () => {
    expect(
      acceptIdentity(claims({ iss: 'https://evil.test' }), policy, now),
    ).toEqual({
      ok: false,
      error: { kind: 'issuer-mismatch' },
    });
  });

  it('rejects expired claims', () => {
    const expired = claims({ exp: Math.floor(now.getTime() / 1000) - 1 });
    expect(acceptIdentity(expired, policy, now)).toEqual({
      ok: false,
      error: { kind: 'expired' },
    });
  });

  it('treats expiry as exclusive at the boundary', () => {
    const atBoundary = claims({ exp: Math.floor(now.getTime() / 1000) });
    expect(acceptIdentity(atBoundary, policy, now)).toEqual({
      ok: false,
      error: { kind: 'expired' },
    });
  });

  it('rejects a missing or unverified email', () => {
    expect(acceptIdentity(claims({ email: null }), policy, now)).toEqual({
      ok: false,
      error: { kind: 'email-missing' },
    });
    expect(
      acceptIdentity(claims({ emailVerified: false }), policy, now),
    ).toEqual({
      ok: false,
      error: { kind: 'email-unverified' },
    });
  });

  it('falls back to the email when no name is asserted', () => {
    const result = acceptIdentity(claims({ name: null }), policy, now);
    expect(result.ok && result.value.name).toBe('person@example.com');
  });
});
