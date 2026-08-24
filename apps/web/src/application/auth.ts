import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, signIn, signOut } from '../diplomat/out/api-client.js';

const ME = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  });
}

export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (idToken: string) => signIn(idToken),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      await client.resetQueries();
    },
  });
}
