import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from './membership.rules';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async roleIn(spaceId: string, userId: string): Promise<Role | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_spaceId: { userId, spaceId } },
    });
    return membership?.role ?? null;
  }
}
