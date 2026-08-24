import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  asApiFailure,
  canManage,
  describeRejection,
  fieldFor,
  validateDraft,
} from './space.js';
import type { Space } from '../model/space.js';

const space: Space = {
  id: 's1',
  name: 'Example Space',
  description: null,
  role: 'host',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('validateDraft', () => {
  it('trims and accepts a valid draft', () => {
    expect(
      validateDraft({ name: '  Trip  ', description: '  notes  ' }),
    ).toEqual({
      ok: true,
      value: { name: 'Trip', description: 'notes' },
    });
  });

  it('turns a blank description into null', () => {
    const result = validateDraft({ name: 'Trip', description: '   ' });
    expect(result.ok && result.value.description).toBe(null);
  });

  it('rejects an empty name', () => {
    expect(validateDraft({ name: '  ', description: null })).toEqual({
      ok: false,
      error: { kind: 'name-empty' },
    });
  });

  it('rejects fields over their limits', () => {
    expect(
      validateDraft({ name: 'a'.repeat(NAME_MAX + 1), description: null }).ok,
    ).toBe(false);
    expect(
      validateDraft({
        name: 'ok',
        description: 'a'.repeat(DESCRIPTION_MAX + 1),
      }).ok,
    ).toBe(false);
  });
});

describe('canManage', () => {
  it('is true for a host and false for a guest', () => {
    expect(canManage(space)).toBe(true);
    expect(canManage({ ...space, role: 'guest' })).toBe(false);
  });
});

describe('fieldFor', () => {
  it('routes an api error code to its form field', () => {
    expect(fieldFor('space.name-empty')).toBe('name');
    expect(fieldFor('space.name-too-long')).toBe('name');
    expect(fieldFor('space.description-too-long')).toBe('description');
  });

  it('returns null for a code that belongs to no field', () => {
    expect(fieldFor('access.not-a-member')).toBe(null);
    expect(fieldFor('space.nothing-to-update')).toBe(null);
  });
});

describe('describeRejection', () => {
  it('includes the limit in a length message', () => {
    expect(describeRejection({ kind: 'name-too-long', max: 80 })).toBe(
      'Name must be at most 80 characters.',
    );
  });
});

describe('asApiFailure', () => {
  it('recognises a failure carrying status, code and message', () => {
    const error = Object.assign(new Error('Name is required.'), {
      status: 422,
      code: 'space.name-empty',
    });
    expect(asApiFailure(error)).toEqual({
      status: 422,
      code: 'space.name-empty',
      message: 'Name is required.',
    });
  });

  it('returns null for anything else', () => {
    expect(asApiFailure(new Error('boom'))).toBe(null);
    expect(asApiFailure(null)).toBe(null);
    expect(asApiFailure('nope')).toBe(null);
    expect(asApiFailure({ status: '422', code: 'x', message: 'y' })).toBe(null);
  });
});
