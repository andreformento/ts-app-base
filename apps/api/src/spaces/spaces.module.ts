import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [MembershipsModule],
  controllers: [SpacesController],
  providers: [SpacesService],
})
export class SpacesModule {}
