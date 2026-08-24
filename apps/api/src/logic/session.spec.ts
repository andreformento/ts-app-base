import { describe, expect, it } from 'vitest';
import { acceptSession, expiryFrom } from './session.js';
import type { Session } from '../model/session.js';

const now = new Date('2026-01-01T00:00:00Z');

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    userId: 'u1',
    tokenHash: 'hash',
    expiresAt: new Date(now.getTime() + 1000),
    revokedAt: null,
    ...overrides,
  };
}

describe('acceptSession', () => {
  it('accepts a live session', () => {
    const live = session();
    expect(acceptSession(live, now)).toEqual({ ok: true, value: live });
  });

  it('rejects an unknown session', () => {
    expect(acceptSession(null, now)).toEqual({
      ok: false,
      error: { kind: 'unknown' },
    });
  });

  it('rejects a revoked session immediately, whatever its expiry', () => {
    const revoked = session({ revokedAt: new Date(now.getTime() - 1) });
    expect(acceptSession(revoked, now)).toEqual({
      ok: false,
      error: { kind: 'revoked' },
    });
  });

  it('rejects an expired session', () => {
    expect(acceptSession(session({ expiresAt: now }), now)).toEqual({
      ok: false,
      error: { kind: 'expired' },
    });
  });
});

describe('expiryFrom', () => {
  it('adds the ttl in seconds', () => {
    expect(expiryFrom(now, 60)).toEqual(new Date('2026-01-01T00:01:00Z'));
  });
});
