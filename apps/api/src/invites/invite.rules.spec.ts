import { describe, expect, it } from 'vitest';
import { INVITE_TTL_SECONDS, canRedeem, expiryFrom } from './invite.rules';

const now = new Date('2026-01-01T00:00:00Z');

describe('canRedeem', () => {
  const live = { expiresAt: new Date(now.getTime() + 1000), redeemedAt: null };

  it('accepts a live invite', () => {
    expect(canRedeem(live, now)).toEqual({ ok: true });
  });

  it('refuses one that does not exist', () => {
    expect(canRedeem(null, now)).toEqual({ ok: false, refusal: 'unknown' });
  });

  it('refuses one already redeemed, so a link cannot be reused', () => {
    expect(canRedeem({ ...live, redeemedAt: now }, now)).toEqual({
      ok: false,
      refusal: 'already-redeemed',
    });
  });

  it('refuses one that has expired, at the boundary too', () => {
    expect(canRedeem({ ...live, expiresAt: now }, now)).toEqual({
      ok: false,
      refusal: 'expired',
    });
  });

  it('treats redemption as decisive even when it has not expired', () => {
    const both = { expiresAt: new Date(now.getTime() + 1e6), redeemedAt: now };
    expect(canRedeem(both, now).ok).toBe(false);
  });
});

describe('expiryFrom', () => {
  it('expires a week out', () => {
    expect(expiryFrom(now).getTime() - now.getTime()).toBe(
      INVITE_TTL_SECONDS * 1000,
    );
  });
});
