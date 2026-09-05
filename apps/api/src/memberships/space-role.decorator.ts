import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from './membership.rules';

export const SpaceRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Role => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { spaceRole: Role }>();
    return request.spaceRole;
  },
);
