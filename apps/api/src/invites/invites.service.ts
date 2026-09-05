import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SpaceEntity } from '../spaces/entities/space.entity';
import { InviteEntity } from './entities/invite.entity';
import { toInviteEntity } from './invite.mapper';
import { toSpaceEntity } from '../spaces/space.mapper';
import { canRedeem, expiryFrom } from './invite.rules';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    spaceId: string,
    userId: string,
    now: Date,
  ): Promise<InviteEntity> {
    const invite = await this.prisma.invite.create({
      data: {
        spaceId,
        createdById: userId,
        token: randomBytes(32).toString('base64url'),
        expiresAt: expiryFrom(now),
      },
    });
    return toInviteEntity(invite);
  }

  async redeem(token: string, userId: string, now: Date): Promise<SpaceEntity> {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    const redeemable = canRedeem(invite, now);
    if (!redeemable.ok || invite === null) {
      throw new NotFoundException('That invitation is no longer usable.');
    }

    const space = await this.prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { redeemedAt: now },
      });
      await tx.membership.upsert({
        where: { userId_spaceId: { userId, spaceId: invite.spaceId } },
        create: { userId, spaceId: invite.spaceId, role: 'guest' },
        update: {},
      });
      return tx.space.findUniqueOrThrow({ where: { id: invite.spaceId } });
    });

    return toSpaceEntity(space, 'guest');
  }
}
