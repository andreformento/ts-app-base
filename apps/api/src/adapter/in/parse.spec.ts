import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseWire } from './parse.js';

const Schema = z.object({ name: z.string(), age: z.number().int() });

describe('parseWire', () => {
  it('returns the parsed value when the payload matches', () => {
    expect(parseWire(Schema, { name: 'a', age: 3 })).toEqual({
      ok: true,
      value: { name: 'a', age: 3 },
    });
  });

  it('describes each problem with its path', () => {
    const result = parseWire(Schema, { age: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.problems.map((p) => p.path).sort()).toEqual([
      'age',
      'name',
    ]);
  });

  it('labels a root-level problem as body rather than an empty path', () => {
    const result = parseWire(Schema, 'not an object');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.problems[0]?.path).toBe('body');
  });

  it('never throws, whatever it is handed', () => {
    expect(() => parseWire(Schema, undefined)).not.toThrow();
    expect(() => parseWire(Schema, null)).not.toThrow();
    expect(parseWire(Schema, null).ok).toBe(false);
  });

  it('strips fields the schema does not declare', () => {
    const result = parseWire(Schema, { name: 'a', age: 3, sneaky: true });
    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      'age',
      'name',
    ]);
  });
});
