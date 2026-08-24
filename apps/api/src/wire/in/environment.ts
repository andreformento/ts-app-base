import { z } from 'zod';

export const Environment = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  OIDC_JWKS_URL: z.url(),
  OIDC_ISSUER: z.string().min(1),
  OIDC_AUDIENCES: z.string().min(1),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
});
export type Environment = z.infer<typeof Environment>;
