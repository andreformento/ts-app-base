import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [MembershipsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
