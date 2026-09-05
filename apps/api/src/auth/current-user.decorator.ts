import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from './session-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: SessionUser }>();
    return request.user;
  },
);
