import {
  Body,
  Controller as NestRoute,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SpaceApplication } from '../../application/space.js';
import { toDraft, toPatch } from '../../adapter/in/space-request.js';
import { fromSpace, fromSpaces } from '../../adapter/out/space-response.js';
import {
  CreateSpaceRequest,
  UpdateSpaceRequest,
} from '../../wire/in/space-request.js';
import { AuthGuard, callerOf } from './auth.guard.js';
import type { Authenticated } from './auth.guard.js';
import { FailureException, parseBody } from './http-error.js';

@NestRoute('spaces')
@UseGuards(AuthGuard)
export class SpaceHttp {
  constructor(private readonly spaces: SpaceApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() request: Authenticated) {
    const parsed = parseBody(CreateSpaceRequest, body);
    const result = await this.spaces.create(
      toDraft(parsed),
      callerOf(request).id,
    );
    if (!result.ok) throw new FailureException(result.error);
    return fromSpace(result.value.space, result.value.role);
  }

  @Get()
  async list(@Req() request: Authenticated) {
    return fromSpaces(await this.spaces.list(callerOf(request).id));
  }

  @Get(':id')
  async read(@Param('id') id: string, @Req() request: Authenticated) {
    const result = await this.spaces.read(id, callerOf(request).id);
    if (!result.ok) throw new FailureException(result.error);
    return fromSpace(result.value.space, result.value.role);
  }

  @Patch(':id')
  async edit(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: Authenticated,
  ) {
    const parsed = parseBody(UpdateSpaceRequest, body);
    const result = await this.spaces.edit(
      id,
      toPatch(parsed),
      callerOf(request).id,
    );
    if (!result.ok) throw new FailureException(result.error);
    return fromSpace(result.value.space, result.value.role);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() request: Authenticated) {
    const result = await this.spaces.remove(id, callerOf(request).id);
    if (!result.ok) throw new FailureException(result.error);
  }
}
