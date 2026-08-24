import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Space, SpaceDraft, SpaceId } from '../model/space.js';
import {
  createSpace,
  deleteSpace,
  fetchSpaces,
  updateSpace,
} from '../diplomat/out/api-client.js';

const SPACES = ['spaces'] as const;

export function useSpaces() {
  return useQuery({ queryKey: SPACES, queryFn: fetchSpaces });
}

export function useCreateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: SpaceDraft) => createSpace(draft),
    onSuccess: () => client.invalidateQueries({ queryKey: SPACES }),
  });
}

export function useUpdateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: SpaceId; patch: Partial<SpaceDraft> }) =>
      updateSpace(id, patch),
    onSuccess: () => client.invalidateQueries({ queryKey: SPACES }),
  });
}

export function useDeleteSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: SpaceId) => deleteSpace(id),

    onMutate: async (id: SpaceId) => {
      await client.cancelQueries({ queryKey: SPACES });
      const previous = client.getQueryData<readonly Space[]>(SPACES);
      client.setQueryData<readonly Space[]>(SPACES, (spaces) =>
        (spaces ?? []).filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined)
        client.setQueryData(SPACES, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: SPACES }),
  });
}
