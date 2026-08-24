import { describe, expect, it } from 'vitest';
import { fromSpace, fromSpaces } from './space-response.js';
import type { Space } from '../../model/space.js';

const space: Space = {
  id: 's1',
  name: 'Example Space',
  description: 'a trip',
  ownerId: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('fromSpace', () => {
  it('maps every field and serializes dates as ISO strings', () => {
    expect(fromSpace(space, 'host')).toEqual({
      id: 's1',
      name: 'Example Space',
      description: 'a trip',
      role: 'host',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('does not leak ownerId or any undeclared field', () => {
    expect(Object.keys(fromSpace(space, 'guest')).sort()).toEqual([
      'createdAt',
      'description',
      'id',
      'name',
      'role',
      'updatedAt',
    ]);
  });

  it('carries a null description through', () => {
    expect(fromSpace({ ...space, description: null }, 'host').description).toBe(
      null,
    );
  });
});

describe('fromSpaces', () => {
  it('wraps entries and preserves each role', () => {
    const result = fromSpaces([
      { space, role: 'host' },
      { space: { ...space, id: 's2' }, role: 'guest' },
    ]);
    expect(result.items.map((i) => [i.id, i.role])).toEqual([
      ['s1', 'host'],
      ['s2', 'guest'],
    ]);
  });

  it('yields an empty list, not null', () => {
    expect(fromSpaces([])).toEqual({ items: [] });
  });
});
