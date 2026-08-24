import { describe, expect, it } from 'vitest';
import { fromDraft, fromPatch } from './space.js';

describe('fromDraft', () => {
  it('maps every field', () => {
    expect(fromDraft({ name: 'Trip', description: 'notes' })).toEqual({
      name: 'Trip',
      description: 'notes',
    });
  });

  it('sends an explicit null description', () => {
    expect(fromDraft({ name: 'Trip', description: null })).toEqual({
      name: 'Trip',
      description: null,
    });
  });
});

describe('fromPatch', () => {
  it('omits absent fields so an unchanged field is never overwritten', () => {
    expect(fromPatch({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
    expect(fromPatch({ description: null })).toEqual({ description: null });
  });

  it('yields an empty patch when nothing changed', () => {
    expect(fromPatch({})).toEqual({});
  });
});
