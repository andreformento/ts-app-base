import { describe, expect, it } from 'vitest';
import { mayManage, roleLabel } from './space.rules';

describe('mayManage', () => {
  it('is true only for a host', () => {
    expect(mayManage({ role: 'host' })).toBe(true);
    expect(mayManage({ role: 'guest' })).toBe(false);
  });
});

describe('roleLabel', () => {
  it('names both roles for display', () => {
    expect(roleLabel('host')).toBe('Host');
    expect(roleLabel('guest')).toBe('Guest');
  });
});
