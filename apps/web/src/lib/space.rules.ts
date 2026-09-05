import type { Role, Space } from '../types/space';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 2000;

export function mayManage(space: Pick<Space, 'role'>): boolean {
  return space.role === 'host';
}

export function roleLabel(role: Role): string {
  return role === 'host' ? 'Host' : 'Guest';
}

export function messageOf(
  payload: unknown,
  fallback = 'Something went wrong.',
): string {
  if (typeof payload !== 'object' || payload === null) return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string' && message.length > 0) return message;
  if (Array.isArray(message) && message.length > 0) return message.join('; ');
  return fallback;
}
