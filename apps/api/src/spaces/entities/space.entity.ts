import type { Role } from '../../memberships/membership.rules';

export class SpaceEntity {
  id!: string;
  name!: string;
  description!: string | null;
  role!: Role;
  createdAt!: Date;
  updatedAt!: Date;
}
