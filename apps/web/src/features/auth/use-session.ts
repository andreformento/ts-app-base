import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const ME = ['me'] as const;

export function useSession() {
  return useQuery({
    queryKey: ME,
    queryFn: api.me,
    retry: false,
    staleTime: 30_000,
  });
}

export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.signIn,
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.signOut,
    onSuccess: async () => {
      await client.resetQueries();
    },
  });
}
