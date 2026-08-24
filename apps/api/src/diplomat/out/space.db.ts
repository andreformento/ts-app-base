import { Injectable } from '@nestjs/common';
import type { Space, SpaceDraft, SpaceId } from '../../model/space.js';
import type { Membership, Role } from '../../model/membership.js';
import type { UserId } from '../../model/user.js';
import { toMembership, toSpace } from '../../adapter/in/space-row.js';
import { Database } from './prisma.js';

@Injectable()
export class SpaceDb {
  constructor(private readonly db: Database) {}

  async create(draft: SpaceDraft, ownerId: UserId): Promise<Space> {
    const row = await this.db.space.create({
      data: {
        name: draft.name,
        description: draft.description,
        ownerId,
        memberships: { create: { userId: ownerId, role: 'host' } },
      },
    });
    return toSpace(row);
  }

  async listFor(
    userId: UserId,
  ): Promise<readonly { space: Space; role: Role }[]> {
    const rows = await this.db.membership.findMany({
      where: { userId },
      include: { space: true },
      orderBy: { space: { createdAt: 'desc' } },
    });
    return rows.map((row) => ({ space: toSpace(row.space), role: row.role }));
  }

  async find(spaceId: SpaceId): Promise<Space | null> {
    const row = await this.db.space.findUnique({ where: { id: spaceId } });
    return row === null ? null : toSpace(row);
  }

  async findMembership(
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Membership | null> {
    const row = await this.db.membership.findUnique({
      where: { userId_spaceId: { userId, spaceId } },
    });
    return row === null ? null : toMembership(row);
  }

  async update(spaceId: SpaceId, draft: SpaceDraft): Promise<Space> {
    const row = await this.db.space.update({
      where: { id: spaceId },
      data: { name: draft.name, description: draft.description },
    });
    return toSpace(row);
  }

  async remove(spaceId: SpaceId): Promise<void> {
    await this.db.space.delete({ where: { id: spaceId } });
  }
}
