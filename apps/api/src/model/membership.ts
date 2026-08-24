import type { SpaceId } from './space.js';
import type { UserId } from './user.js';

export type Role = 'host' | 'guest';

export type Membership = {
  readonly userId: UserId;
  readonly spaceId: SpaceId;
  readonly role: Role;
};

export type Action = 'read' | 'manage';

export type AccessRejection =
  | { readonly kind: 'not-a-member' }
  | { readonly kind: 'role-insufficient'; readonly required: Role };
