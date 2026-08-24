import type { Credentials } from '../model/credentials.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../model/credentials.js';

const BEARER = 'Bearer ';

export function readCookie(
  credentials: Credentials,
  name: string,
): string | null {
  const value = credentials.cookies[name];
  return value !== undefined && value.length > 0 ? value : null;
}

export function readAccessToken(credentials: Credentials): string | null {
  const header = credentials.authorization;
  if (header !== null && header.startsWith(BEARER)) {
    const token = header.slice(BEARER.length).trim();
    return token.length > 0 ? token : null;
  }
  return readCookie(credentials, ACCESS_COOKIE);
}

export function readRefreshToken(
  credentials: Credentials,
  fromBody: string | null,
): string | null {
  if (fromBody !== null && fromBody.length > 0) return fromBody;
  return readCookie(credentials, REFRESH_COOKIE);
}
