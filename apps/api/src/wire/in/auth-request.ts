import { z } from 'zod';

export const AuthenticateRequest = z.object({
  idToken: z.string().min(1),
});
export type AuthenticateRequest = z.infer<typeof AuthenticateRequest>;

export const RefreshRequest = z.object({
  refreshToken: z.string().min(1).nullish(),
});
export type RefreshRequest = z.infer<typeof RefreshRequest>;
