import { z } from 'zod';

export const CreateSpaceRequest = z.object({
  name: z.string(),
  description: z.string().nullish(),
});
export type CreateSpaceRequest = z.infer<typeof CreateSpaceRequest>;

export const UpdateSpaceRequest = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
});
export type UpdateSpaceRequest = z.infer<typeof UpdateSpaceRequest>;
