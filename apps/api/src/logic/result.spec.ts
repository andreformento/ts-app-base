import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('ok', () => {
  it('wraps a value as a success', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });

  it('carries null and undefined without collapsing them', () => {
    expect(ok(null)).toEqual({ ok: true, value: null });
    expect(ok(undefined)).toEqual({ ok: true, value: undefined });
  });
});

describe('err', () => {
  it('wraps a value as a failure', () => {
    expect(err({ kind: 'nope' })).toEqual({
      ok: false,
      error: { kind: 'nope' },
    });
  });

  it('is distinguishable from a success carrying the same payload', () => {
    expect(err('x').ok).toBe(false);
    expect(ok('x').ok).toBe(true);
  });
});
