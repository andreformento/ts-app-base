import { describe, expect, it } from 'vitest';
import { mayManage, mayRead, satisfies } from './membership.rules';

describe('mayRead', () => {
  it('lets any member read and refuses a stranger', () => {
    expect(mayRead('host')).toBe(true);
    expect(mayRead('guest')).toBe(true);
    expect(mayRead(null)).toBe(false);
  });
});

describe('mayManage', () => {
  it('lets only a host manage', () => {
    expect(mayManage('host')).toBe(true);
    expect(mayManage('guest')).toBe(false);
    expect(mayManage(null)).toBe(false);
  });
});

describe('satisfies', () => {
  it('reads the requirement a route declares', () => {
    expect(satisfies('guest', 'guest')).toBe(true);
    expect(satisfies('host', 'guest')).toBe(true);
    expect(satisfies('guest', 'host')).toBe(false);
    expect(satisfies('host', 'host')).toBe(true);
  });

  it('refuses a stranger whatever the route asks for', () => {
    expect(satisfies(null, 'guest')).toBe(false);
    expect(satisfies(null, 'host')).toBe(false);
  });
});
