export type UserId = string;

export type User = {
  readonly id: UserId;
  readonly subject: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

export type Identity = {
  readonly subject: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

export type IdentityClaims = {
  readonly iss: string;
  readonly sub: string;
  readonly aud: string;
  readonly exp: number;
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly name: string | null;
  readonly picture: string | null;
};

export type IdentityRejection =
  | { readonly kind: 'issuer-mismatch' }
  | { readonly kind: 'audience-not-allowed' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'email-missing' }
  | { readonly kind: 'email-unverified' };

export type IdentityPolicy = {
  readonly issuer: string;
  readonly audiences: readonly string[];
};
