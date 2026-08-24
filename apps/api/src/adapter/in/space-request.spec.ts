import { describe, expect, it } from 'vitest';
import { toDraft, toPatch } from './space-request.js';

describe('toDraft', () => {
  it('maps every field', () => {
    expect(toDraft({ name: 'Trip', description: 'a trip' })).toEqual({
      name: 'Trip',
      description: 'a trip',
    });
  });

  it('normalizes an absent description to null', () => {
    expect(toDraft({ name: 'Trip' })).toEqual({
      name: 'Trip',
      description: null,
    });
    expect(toDraft({ name: 'Trip', description: null })).toEqual({
      name: 'Trip',
      description: null,
    });
  });
});

describe('toPatch', () => {
  it('maps every field', () => {
    expect(toPatch({ name: 'a', description: 'b' })).toEqual({
      name: 'a',
      description: 'b',
    });
  });

  it('turns absent fields into null so an empty patch is detectable', () => {
    expect(toPatch({})).toEqual({ name: null, description: null });
  });
});
