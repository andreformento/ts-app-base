import { SetMetadata } from '@nestjs/common';
import type { Role } from './membership.rules';

export const REQUIRES_ROLE = 'requires-role';

export const RequiresRole = (role: Role) => SetMetadata(REQUIRES_ROLE, role);
