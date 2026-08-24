import { z } from 'zod';

export const CreateSpaceRequest = z.object({
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(80, 'Name must be at most 80 characters.'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters.')
    .nullable(),
});
export type CreateSpaceRequest = z.infer<typeof CreateSpaceRequest>;

export const UpdateSpaceRequest = CreateSpaceRequest.partial();
export type UpdateSpaceRequest = z.infer<typeof UpdateSpaceRequest>;

export const AuthenticateRequest = z.object({ idToken: z.string().min(1) });
export type AuthenticateRequest = z.infer<typeof AuthenticateRequest>;

export const SpaceFormValues = z.object({
  name: CreateSpaceRequest.shape.name,
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters.'),
});
export type SpaceFormValues = z.infer<typeof SpaceFormValues>;
