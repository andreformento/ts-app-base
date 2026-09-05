export const ACCESS_COOKIE = 'appname_access';
export const REFRESH_COOKIE = 'appname_refresh';

export type IdentityClaims = {
  readonly iss?: unknown;
  readonly sub?: unknown;
  readonly aud?: unknown;
  readonly exp?: unknown;
  readonly email?: unknown;
  readonly email_verified?: unknown;
  readonly name?: unknown;
  readonly picture?: unknown;
};

export type Identity = {
  readonly subject: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

export type IdentityRefusal =
  | 'issuer-mismatch'
  | 'audience-not-allowed'
  | 'subject-missing'
  | 'expired'
  | 'email-missing'
  | 'email-unverified';

export type Accepted<T, R> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly refusal: R };

export type IdentityPolicy = {
  readonly issuer: string;
  readonly audiences: readonly string[];
};

export function acceptIdentity(
  claims: IdentityClaims,
  policy: IdentityPolicy,
  now: Date,
): Accepted<Identity, IdentityRefusal> {
  if (claims.iss !== policy.issuer)
    return { ok: false, refusal: 'issuer-mismatch' };

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const allowed = audiences.some(
    (audience) =>
      typeof audience === 'string' && policy.audiences.includes(audience),
  );
  if (!allowed) return { ok: false, refusal: 'audience-not-allowed' };

  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    return { ok: false, refusal: 'subject-missing' };
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now.getTime()) {
    return { ok: false, refusal: 'expired' };
  }
  if (typeof claims.email !== 'string' || claims.email.length === 0) {
    return { ok: false, refusal: 'email-missing' };
  }
  if (claims.email_verified !== true)
    return { ok: false, refusal: 'email-unverified' };

  return {
    ok: true,
    value: {
      subject: claims.sub,
      email: claims.email,
      name: typeof claims.name === 'string' ? claims.name : claims.email,
      pictureUrl: typeof claims.picture === 'string' ? claims.picture : null,
    },
  };
}

export type StoredSession = {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
};

export type SessionRefusal = 'unknown' | 'revoked' | 'expired';

export function acceptSession(
  session: StoredSession | null,
  now: Date,
): Accepted<StoredSession, SessionRefusal> {
  if (session === null) return { ok: false, refusal: 'unknown' };
  if (session.revokedAt !== null) return { ok: false, refusal: 'revoked' };
  if (session.expiresAt.getTime() <= now.getTime())
    return { ok: false, refusal: 'expired' };
  return { ok: true, value: session };
}

export function expiryFrom(now: Date, ttlSeconds: number): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}

export function readRefreshToken(
  fromBody: string | null | undefined,
  cookies: Readonly<Record<string, string | undefined>>,
): string | null {
  if (typeof fromBody === 'string' && fromBody.length > 0) return fromBody;
  const cookie = cookies[REFRESH_COOKIE];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}
