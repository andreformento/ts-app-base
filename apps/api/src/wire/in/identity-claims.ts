import { z } from 'zod';

export const IdentityClaimsPayload = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  email: z.string().nullish(),
  email_verified: z.boolean().nullish(),
  name: z.string().nullish(),
  picture: z.string().nullish(),
});
export type IdentityClaimsPayload = z.infer<typeof IdentityClaimsPayload>;
