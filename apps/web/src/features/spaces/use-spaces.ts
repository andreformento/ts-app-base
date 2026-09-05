import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Space } from '../../types/space';

const SPACES = ['spaces'] as const;

export function useSpaces() {
  return useQuery({ queryKey: SPACES, queryFn: api.listSpaces });
}

export function useCreateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createSpace,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: SPACES });
    },
  });
}

export function useUpdateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; description?: string | null };
    }) => api.updateSpace(id, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: SPACES });
    },
  });
}

export function useDeleteSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSpace,
    onMutate: async (id: string) => {
      await client.cancelQueries({ queryKey: SPACES });
      const previous = client.getQueryData<Space[]>(SPACES);
      client.setQueryData<Space[]>(SPACES, (spaces) =>
        (spaces ?? []).filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined)
        client.setQueryData(SPACES, context.previous);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: SPACES });
    },
  });
}
