export type Role = 'host' | 'guest';

export function mayRead(role: Role | null): boolean {
  return role !== null;
}

export function mayManage(role: Role | null): boolean {
  return role === 'host';
}

export function satisfies(role: Role | null, required: Role): boolean {
  return required === 'host' ? mayManage(role) : mayRead(role);
}
