import { describe, expect, it } from 'vitest';
import {
  readAccessToken,
  readCookie,
  readRefreshToken,
} from './credentials.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../model/credentials.js';
import type { Credentials } from '../model/credentials.js';

function credentials(overrides: Partial<Credentials> = {}): Credentials {
  return { authorization: null, cookies: {}, ...overrides };
}

describe('readAccessToken', () => {
  it('reads a bearer token, as a native client sends it', () => {
    expect(readAccessToken(credentials({ authorization: 'Bearer abc' }))).toBe(
      'abc',
    );
  });

  it('reads the cookie, as a browser sends it', () => {
    expect(
      readAccessToken(credentials({ cookies: { [ACCESS_COOKIE]: 'abc' } })),
    ).toBe('abc');
  });

  it('prefers the bearer header when both envelopes are present', () => {
    const both = credentials({
      authorization: 'Bearer header',
      cookies: { [ACCESS_COOKIE]: 'cookie' },
    });
    expect(readAccessToken(both)).toBe('header');
  });

  it('returns null when neither envelope carries a token', () => {
    expect(readAccessToken(credentials())).toBe(null);
  });

  it('ignores a non-bearer authorization scheme', () => {
    expect(readAccessToken(credentials({ authorization: 'Basic abc' }))).toBe(
      null,
    );
  });

  it('falls back to the cookie when the bearer header carries nothing', () => {
    const empty = credentials({
      authorization: 'Bearer   ',
      cookies: { [ACCESS_COOKIE]: 'cookie' },
    });
    expect(readAccessToken(empty)).toBe(null);
  });

  it('treats an empty cookie as absent', () => {
    expect(
      readAccessToken(credentials({ cookies: { [ACCESS_COOKIE]: '' } })),
    ).toBe(null);
  });
});

describe('readRefreshToken', () => {
  it('prefers an explicit body token, as a native client sends it', () => {
    const both = credentials({ cookies: { [REFRESH_COOKIE]: 'cookie' } });
    expect(readRefreshToken(both, 'body')).toBe('body');
  });

  it('falls back to the cookie', () => {
    expect(
      readRefreshToken(
        credentials({ cookies: { [REFRESH_COOKIE]: 'cookie' } }),
        null,
      ),
    ).toBe('cookie');
  });

  it('returns null when neither is present', () => {
    expect(readRefreshToken(credentials(), null)).toBe(null);
  });

  it('treats an empty body token as absent', () => {
    expect(
      readRefreshToken(
        credentials({ cookies: { [REFRESH_COOKIE]: 'cookie' } }),
        '',
      ),
    ).toBe('cookie');
  });
});

describe('readCookie', () => {
  it('returns null for a cookie that is not set', () => {
    expect(readCookie(credentials(), 'missing')).toBe(null);
  });
});
