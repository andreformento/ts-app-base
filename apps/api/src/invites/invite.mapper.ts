import type { InviteEntity } from './entities/invite.entity';

export type StoredInvite = {
  readonly token: string;
  readonly spaceId: string;
  readonly expiresAt: Date;
};

export function toInviteEntity(invite: StoredInvite): InviteEntity {
  return {
    token: invite.token,
    spaceId: invite.spaceId,
    expiresAt: invite.expiresAt,
  };
}
