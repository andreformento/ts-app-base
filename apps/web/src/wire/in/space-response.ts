import { z } from 'zod';

export const SpaceResponse = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  role: z.enum(['host', 'guest']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SpaceResponse = z.infer<typeof SpaceResponse>;

export const SpaceListResponse = z.object({ items: z.array(SpaceResponse) });
export type SpaceListResponse = z.infer<typeof SpaceListResponse>;

export const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  pictureUrl: z.string().nullable(),
});
export type UserResponse = z.infer<typeof UserResponse>;

export const ErrorResponse = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
