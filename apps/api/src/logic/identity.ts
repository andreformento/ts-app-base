import type {
  Identity,
  IdentityClaims,
  IdentityPolicy,
  IdentityRejection,
} from '../model/user.js';
import type { Result } from '../model/result.js';
import { err, ok } from './result.js';

export function acceptIdentity(
  claims: IdentityClaims,
  policy: IdentityPolicy,
  now: Date,
): Result<Identity, IdentityRejection> {
  if (claims.iss !== policy.issuer) return err({ kind: 'issuer-mismatch' });
  if (!policy.audiences.includes(claims.aud))
    return err({ kind: 'audience-not-allowed' });
  if (claims.exp * 1000 <= now.getTime()) return err({ kind: 'expired' });
  if (claims.email === null || claims.email.length === 0)
    return err({ kind: 'email-missing' });
  if (!claims.emailVerified) return err({ kind: 'email-unverified' });

  return ok({
    subject: claims.sub,
    email: claims.email,
    name: claims.name ?? claims.email,
    pictureUrl: claims.picture,
  });
}
