import type { User, UserId } from './user.js';

export type SessionId = string;

export type Session = {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
};

export type SessionRejection =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'revoked' }
  | { readonly kind: 'expired' };

export type AccessClaims = {
  readonly sub: UserId;
  readonly sid: SessionId;
};

export type Tokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: User;
};
