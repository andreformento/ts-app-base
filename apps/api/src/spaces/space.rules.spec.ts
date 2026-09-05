import { describe, expect, it } from 'vitest';
import { hasChanges, merge } from './space.rules';

describe('hasChanges', () => {
  it('is false for a patch that carries nothing', () => {
    expect(hasChanges({})).toBe(false);
  });

  it('is true for either field, including an explicit null', () => {
    expect(hasChanges({ name: 'Renamed' })).toBe(true);
    expect(hasChanges({ description: 'notes' })).toBe(true);
    expect(hasChanges({ description: null })).toBe(true);
  });
});

describe('merge', () => {
  const current = { name: 'Example', description: 'notes' };

  it('keeps what the patch omits', () => {
    expect(merge(current, { name: 'Renamed' })).toEqual({
      name: 'Renamed',
      description: 'notes',
    });
    expect(merge(current, { description: 'updated' })).toEqual({
      name: 'Example',
      description: 'updated',
    });
  });

  it('distinguishes an absent field from an explicit null', () => {
    expect(merge(current, {}).description).toBe('notes');
    expect(merge(current, { description: null }).description).toBe(null);
  });

  it('leaves everything alone for an empty patch', () => {
    expect(merge(current, {})).toEqual(current);
  });
});
