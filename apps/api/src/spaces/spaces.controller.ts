import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequiresRole } from '../memberships/requires-role.decorator';
import { SpaceRole } from '../memberships/space-role.decorator';
import { SpaceRoleGuard } from '../memberships/space-role.guard';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceEntity } from './entities/space.entity';
import { SpacesService } from './spaces.service';
import type { Role } from '../memberships/membership.rules';
import type { SessionUser } from '../auth/session-user';

@ApiTags('spaces')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Post()
  create(
    @Body() dto: CreateSpaceDto,
    @CurrentUser() user: SessionUser,
  ): Promise<SpaceEntity> {
    return this.spaces.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: SessionUser): Promise<SpaceEntity[]> {
    return this.spaces.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @SpaceRole() role: Role,
  ): Promise<SpaceEntity> {
    return this.spaces.findOne(id, role);
  }

  @Patch(':id')
  @RequiresRole('host')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
  ): Promise<SpaceEntity> {
    return this.spaces.update(id, dto);
  }

  @Delete(':id')
  @RequiresRole('host')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.spaces.remove(id);
  }
}
