import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  applyPatch,
  validateDraft,
} from './space.js';
import type { Space } from '../model/space.js';

const space: Space = {
  id: 's1',
  name: 'Example Space',
  description: 'a trip',
  ownerId: 'u1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('validateDraft', () => {
  it('accepts a valid draft and trims the name', () => {
    const result = validateDraft({
      name: '  Example Space  ',
      description: 'a trip',
    });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Example Space', description: 'a trip' },
    });
  });

  it('normalizes a blank description to null', () => {
    const result = validateDraft({ name: 'x', description: '   ' });
    expect(result.ok && result.value.description).toBe(null);
  });

  it('rejects an empty name', () => {
    expect(validateDraft({ name: '   ', description: null })).toEqual({
      ok: false,
      error: { kind: 'name-empty' },
    });
  });

  it('rejects a name over the limit', () => {
    const result = validateDraft({
      name: 'a'.repeat(NAME_MAX + 1),
      description: null,
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'name-too-long', max: NAME_MAX },
    });
  });

  it('accepts a name exactly at the limit', () => {
    expect(
      validateDraft({ name: 'a'.repeat(NAME_MAX), description: null }).ok,
    ).toBe(true);
  });

  it('rejects a description over the limit', () => {
    const result = validateDraft({
      name: 'x',
      description: 'a'.repeat(DESCRIPTION_MAX + 1),
    });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'description-too-long', max: DESCRIPTION_MAX },
    });
  });
});

describe('applyPatch', () => {
  it('rejects a patch that changes nothing', () => {
    expect(applyPatch(space, { name: null, description: null })).toEqual({
      ok: false,
      error: { kind: 'nothing-to-update' },
    });
  });

  it('keeps the existing description when only the name changes', () => {
    const result = applyPatch(space, { name: 'Renamed', description: null });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Renamed', description: 'a trip' },
    });
  });

  it('keeps the existing name when only the description changes', () => {
    const result = applyPatch(space, { name: null, description: 'updated' });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Example Space', description: 'updated' },
    });
  });

  it('revalidates the patched result', () => {
    expect(applyPatch(space, { name: '   ', description: null })).toEqual({
      ok: false,
      error: { kind: 'name-empty' },
    });
  });
});
