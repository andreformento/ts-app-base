import type { Role, Space } from '../types/space';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 2000;

export function mayManage(space: Pick<Space, 'role'>): boolean {
  return space.role === 'host';
}

export function roleLabel(role: Role): string {
  return role === 'host' ? 'Host' : 'Guest';
}
