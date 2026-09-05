import type { SpaceEntity } from './entities/space.entity';
import type { Role } from '../memberships/membership.rules';

export type StoredSpace = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StoredMembership = {
  readonly space: StoredSpace;
  readonly role: Role;
};

export function toSpaceEntity(space: StoredSpace, role: Role): SpaceEntity {
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    role,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}

export function toSpaceEntities(
  memberships: readonly StoredMembership[],
): SpaceEntity[] {
  return memberships.map((membership) =>
    toSpaceEntity(membership.space, membership.role),
  );
}
