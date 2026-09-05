import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequiresRole } from '../memberships/requires-role.decorator';
import { SpaceRoleGuard } from '../memberships/space-role.guard';
import { SpaceEntity } from '../spaces/entities/space.entity';
import { InviteEntity } from './entities/invite.entity';
import { InvitesService } from './invites.service';
import type { SessionUser } from '../auth/session-user';

@ApiTags('invites')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post('spaces/:id/invites')
  @RequiresRole('host')
  create(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ): Promise<InviteEntity> {
    return this.invites.create(id, user.id, new Date());
  }

  @Post('invites/:token/redeem')
  redeem(
    @Param('token') token: string,
    @CurrentUser() user: SessionUser,
  ): Promise<SpaceEntity> {
    return this.invites.redeem(token, user.id, new Date());
  }
}
