import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { MembershipsService } from './memberships.service';
import { REQUIRES_ROLE } from './requires-role.decorator';
import { satisfies } from './membership.rules';
import type { Role } from './membership.rules';
import type { SessionUser } from '../auth/session-user';

type SpaceRequest = Request & { user?: SessionUser; spaceRole?: Role };

@Injectable()
export class SpaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SpaceRequest>();
    const spaceId = spaceIdOf(request);
    if (spaceId === null) return true;

    const user = request.user;
    if (user === undefined) throw notAMember();

    const required =
      this.reflector.getAllAndOverride<Role | undefined>(REQUIRES_ROLE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'guest';

    const role = await this.memberships.roleIn(spaceId, user.id);
    if (role === null) throw notAMember();
    if (!satisfies(role, required)) throw wrongRole();

    request.spaceRole = role;
    return true;
  }
}

function spaceIdOf(request: SpaceRequest): string | null {
  const params = request.params as Record<string, string | undefined>;
  return params['spaceId'] ?? params['id'] ?? null;
}

function notAMember(): Error {
  return new ForbiddenException('You are not a member of this space.');
}

function wrongRole(): Error {
  return new ForbiddenException('Your role does not allow this action.');
}
