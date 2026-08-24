import { describe, expect, it } from 'vitest';
import { toSpace, toUser } from './space.js';

describe('toSpace', () => {
  it('maps every field and parses dates', () => {
    const space = toSpace({
      id: 's1',
      name: 'Trip',
      description: 'notes',
      role: 'host',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(space.id).toBe('s1');
    expect(space.name).toBe('Trip');
    expect(space.description).toBe('notes');
    expect(space.role).toBe('host');
    expect(space.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(space.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('carries a null description through', () => {
    const space = toSpace({
      id: 's1',
      name: 'Trip',
      description: null,
      role: 'guest',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(space.description).toBe(null);
  });
});

describe('toUser', () => {
  it('maps every field', () => {
    expect(
      toUser({ id: 'u1', email: 'a@b.test', name: 'A', pictureUrl: null }),
    ).toEqual({
      id: 'u1',
      email: 'a@b.test',
      name: 'A',
      pictureUrl: null,
    });
  });
});
