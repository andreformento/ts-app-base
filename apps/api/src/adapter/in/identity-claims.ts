import type { IdentityClaims } from '../../model/user.js';
import type { IdentityClaimsPayload } from '../../wire/in/identity-claims.js';

export function toIdentityClaims(
  payload: IdentityClaimsPayload,
): IdentityClaims {
  const audience = Array.isArray(payload.aud)
    ? (payload.aud[0] ?? '')
    : payload.aud;
  return {
    iss: payload.iss,
    sub: payload.sub,
    aud: audience,
    exp: payload.exp,
    email: payload.email ?? null,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
