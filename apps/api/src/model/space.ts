import type { AccessRejection, Role } from './membership.js';
import type { UserId } from './user.js';

export type SpaceId = string;

export type Space = {
  readonly id: SpaceId;
  readonly name: string;
  readonly description: string | null;
  readonly ownerId: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SpaceDraft = {
  readonly name: string;
  readonly description: string | null;
};

export type SpacePatch = {
  readonly name: string | null;
  readonly description: string | null;
};

export type SpaceRejection =
  | { readonly kind: 'name-empty' }
  | { readonly kind: 'name-too-long'; readonly max: number }
  | { readonly kind: 'description-too-long'; readonly max: number }
  | { readonly kind: 'nothing-to-update' };

export type SpaceView = { readonly space: Space; readonly role: Role };

export type SpaceFailure =
  | { readonly of: 'space'; readonly rejection: SpaceRejection }
  | { readonly of: 'access'; readonly rejection: AccessRejection };
