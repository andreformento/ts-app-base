import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../../model/user.js';
import { AuthApplication } from '../../application/auth.js';
import { credentialsOf } from './credentials.js';
import { FailureException } from './http-error.js';

export type Authenticated = Request & { caller?: User };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthApplication) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Authenticated>();
    const resolved = await this.auth.resolveFrom(
      credentialsOf(request),
      new Date(),
    );
    if (!resolved.ok)
      throw new FailureException({ of: 'session', rejection: resolved.error });

    request.caller = resolved.value;
    return true;
  }
}

export function callerOf(request: Authenticated): User {
  const caller = request.caller;
  if (caller === undefined)
    throw new FailureException({
      of: 'session',
      rejection: { kind: 'unknown' },
    });
  return caller;
}
