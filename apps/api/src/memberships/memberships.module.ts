import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { SpaceRoleGuard } from './space-role.guard';

@Module({
  providers: [MembershipsService, SpaceRoleGuard],
  exports: [MembershipsService, SpaceRoleGuard],
})
export class MembershipsModule {}
