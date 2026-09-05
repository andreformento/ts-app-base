import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceEntity } from './entities/space.entity';
import { toSpaceEntities, toSpaceEntity } from './space.mapper';
import { hasChanges, merge } from './space.rules';
import type { Role } from '../memberships/membership.rules';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpaceDto, userId: string): Promise<SpaceEntity> {
    const space = await this.prisma.space.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        ownerId: userId,
        memberships: { create: { userId, role: 'host' } },
      },
    });
    return toSpaceEntity(space, 'host');
  }

  async findAll(userId: string): Promise<SpaceEntity[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { space: true },
      orderBy: { space: { createdAt: 'desc' } },
    });
    return toSpaceEntities(memberships);
  }

  async findOne(id: string, role: Role): Promise<SpaceEntity> {
    const space = await this.prisma.space.findUniqueOrThrow({ where: { id } });
    return toSpaceEntity(space, role);
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<SpaceEntity> {
    if (!hasChanges(dto)) {
      throw new UnprocessableEntityException(
        'Provide at least one field to update.',
      );
    }

    const current = await this.prisma.space.findUniqueOrThrow({
      where: { id },
    });

    const space = await this.prisma.space.update({
      where: { id },
      data: merge(
        { name: current.name, description: current.description },
        dto,
      ),
    });
    return toSpaceEntity(space, 'host');
  }

  async remove(id: string): Promise<void> {
    await this.prisma.space.delete({ where: { id } });
  }
}
