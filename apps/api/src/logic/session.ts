import type { Session, SessionRejection } from '../model/session.js';
import type { Result } from '../model/result.js';
import { err, ok } from './result.js';

export function acceptSession(
  session: Session | null,
  now: Date,
): Result<Session, SessionRejection> {
  if (session === null) return err({ kind: 'unknown' });
  if (session.revokedAt !== null) return err({ kind: 'revoked' });
  if (session.expiresAt.getTime() <= now.getTime())
    return err({ kind: 'expired' });
  return ok(session);
}

export function expiryFrom(now: Date, ttlSeconds: number): Date {
  return new Date(now.getTime() + ttlSeconds * 1000);
}
