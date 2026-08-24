import { z } from 'zod';

export const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  pictureUrl: z.string().nullable(),
});
export type UserResponse = z.infer<typeof UserResponse>;

export const AuthResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserResponse,
});
export type AuthResponse = z.infer<typeof AuthResponse>;
