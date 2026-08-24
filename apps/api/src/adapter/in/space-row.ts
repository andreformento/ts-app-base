import type {
  Space as SpaceRow,
  Membership as MembershipRow,
  User as UserRow,
  Session as SessionRow,
} from '@prisma/client';
import type { Space } from '../../model/space.js';
import type { Membership } from '../../model/membership.js';
import type { User } from '../../model/user.js';
import type { Session } from '../../model/session.js';

export function toSpace(row: SpaceRow): Space {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toMembership(row: MembershipRow): Membership {
  return { userId: row.userId, spaceId: row.spaceId, role: row.role };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    subject: row.subject,
    email: row.email,
    name: row.name,
    pictureUrl: row.pictureUrl,
  };
}

export function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}
