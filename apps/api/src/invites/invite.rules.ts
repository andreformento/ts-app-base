export const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

export type InviteState = {
  readonly expiresAt: Date;
  readonly redeemedAt: Date | null;
};

export type InviteRefusal = 'unknown' | 'already-redeemed' | 'expired';

export type Redeemable =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusal: InviteRefusal };

export function canRedeem(invite: InviteState | null, now: Date): Redeemable {
  if (invite === null) return { ok: false, refusal: 'unknown' };
  if (invite.redeemedAt !== null)
    return { ok: false, refusal: 'already-redeemed' };
  if (invite.expiresAt.getTime() <= now.getTime())
    return { ok: false, refusal: 'expired' };
  return { ok: true };
}

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_SECONDS * 1000);
}
