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

export const SpaceListResponse = z.object({
  items: z.array(SpaceResponse),
});
export type SpaceListResponse = z.infer<typeof SpaceListResponse>;
