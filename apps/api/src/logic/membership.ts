import type {
  AccessRejection,
  Action,
  Membership,
  Role,
} from '../model/membership.js';
import type { Result } from '../model/result.js';
import { err, ok } from './result.js';

const REQUIRED: Record<Action, Role> = { read: 'guest', manage: 'host' };

function satisfies(role: Role, required: Role): boolean {
  return required === 'guest' ? true : role === 'host';
}

export function authorize(
  membership: Membership | null,
  action: Action,
): Result<Membership, AccessRejection> {
  if (membership === null) return err({ kind: 'not-a-member' });
  const required = REQUIRED[action];
  if (!satisfies(membership.role, required))
    return err({ kind: 'role-insufficient', required });
  return ok(membership);
}
