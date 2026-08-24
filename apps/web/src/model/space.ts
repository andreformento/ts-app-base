export type SpaceId = string;
export type Role = 'host' | 'guest';

export type Space = {
  readonly id: SpaceId;
  readonly name: string;
  readonly description: string | null;
  readonly role: Role;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SpaceDraft = {
  readonly name: string;
  readonly description: string | null;
};

export type SpaceRejection =
  | { readonly kind: 'name-empty' }
  | { readonly kind: 'name-too-long'; readonly max: number }
  | { readonly kind: 'description-too-long'; readonly max: number };
