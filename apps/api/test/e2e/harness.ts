import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { signIdToken } from './identity-provider';
import { call } from './client';
import type { Session } from './responses';

export const WEB_CLIENT = 'web-client';
export const MOBILE_CLIENT = 'mobile-client';

export type Signed = Session & { readonly cookies: readonly string[] };

export type TokenClaims = {
  subject: string;
  audience: string;
  issuer?: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string;
  expiresInSeconds?: number;
};

export type Harness = {
  readonly app: INestApplication;
  readonly url: string;
  idToken: (claims: TokenClaims) => Promise<string>;
  signIn: (subject?: string) => Promise<Signed>;
  stop: () => Promise<void>;
};

export async function startHarness(): Promise<Harness> {
  process.env['DATABASE_URL'] = inject('databaseUrl');
  process.env['AUTH_SECRET'] = 'a-test-secret-that-is-long-enough-to-pass';
  process.env['OIDC_JWKS_URL'] = inject('jwksUrl');
  process.env['OIDC_ISSUER'] = inject('issuer');
  process.env['OIDC_AUDIENCES'] = `${WEB_CLIENT},${MOBILE_CLIENT}`;
  process.env['COOKIE_SECURE'] = 'false';

  const { createApp } = await import('../../src/app');
  const app = await createApp();
  await app.init();
  await app.listen(0);

  const url = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  const signingKey = inject('signingKey');
  const issuer = inject('issuer');

  const idToken: Harness['idToken'] = (claims) =>
    signIdToken(signingKey, { issuer, ...claims });

  return {
    app,
    url,
    idToken,
    signIn: async (subject = randomUUID()) => {
      const token = await idToken({ subject, audience: WEB_CLIENT });
      const response = await call<Signed>(url, '/auth/google', {
        method: 'POST',
        body: { idToken: token },
      });
      return { ...response.body, cookies: response.cookies };
    },
    stop: async () => {
      await app.close();
    },
  };
}
