import { describe, expect, it } from 'vitest';
import { authorize } from './membership.js';
import type { Membership } from '../model/membership.js';

const host: Membership = { userId: 'u1', spaceId: 's1', role: 'host' };
const guest: Membership = { userId: 'u2', spaceId: 's1', role: 'guest' };

describe('authorize', () => {
  it('denies a non-member every action', () => {
    expect(authorize(null, 'read')).toEqual({
      ok: false,
      error: { kind: 'not-a-member' },
    });
    expect(authorize(null, 'manage')).toEqual({
      ok: false,
      error: { kind: 'not-a-member' },
    });
  });

  it('lets a guest read', () => {
    expect(authorize(guest, 'read')).toEqual({ ok: true, value: guest });
  });

  it('stops a guest managing', () => {
    expect(authorize(guest, 'manage')).toEqual({
      ok: false,
      error: { kind: 'role-insufficient', required: 'host' },
    });
  });

  it('lets a host read and manage', () => {
    expect(authorize(host, 'read')).toEqual({ ok: true, value: host });
    expect(authorize(host, 'manage')).toEqual({ ok: true, value: host });
  });
});
