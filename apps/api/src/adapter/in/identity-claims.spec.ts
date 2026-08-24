import { describe, expect, it } from 'vitest';
import { toIdentityClaims } from './identity-claims.js';

const payload = {
  iss: 'https://issuer.test',
  sub: 'subject-1',
  aud: 'web-client',
  exp: 1_800_000_000,
  email: 'person@example.com',
  email_verified: true,
  name: 'A Person',
  picture: 'https://pic.test/a.png',
};

describe('toIdentityClaims', () => {
  it('maps every field', () => {
    expect(toIdentityClaims(payload)).toEqual({
      iss: 'https://issuer.test',
      sub: 'subject-1',
      aud: 'web-client',
      exp: 1_800_000_000,
      email: 'person@example.com',
      emailVerified: true,
      name: 'A Person',
      picture: 'https://pic.test/a.png',
    });
  });

  it('takes the first audience when the provider sends an array', () => {
    expect(
      toIdentityClaims({ ...payload, aud: ['mobile-client', 'other'] }).aud,
    ).toBe('mobile-client');
  });

  it('yields an empty audience for an empty array, which logic then rejects', () => {
    expect(toIdentityClaims({ ...payload, aud: [] }).aud).toBe('');
  });

  it('defaults an absent email_verified to false rather than trusting it', () => {
    expect(
      toIdentityClaims({ ...payload, email_verified: null }).emailVerified,
    ).toBe(false);
  });

  it('maps absent optional fields to null', () => {
    const claims = toIdentityClaims({ iss: 'i', sub: 's', aud: 'a', exp: 1 });
    expect(claims).toEqual({
      iss: 'i',
      sub: 's',
      aud: 'a',
      exp: 1,
      email: null,
      emailVerified: false,
      name: null,
      picture: null,
    });
  });
});
