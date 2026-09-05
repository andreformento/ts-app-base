import { messageOf } from './space.rules';
import type { Space, User } from '../types/space';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const text = await response.text();
  const payload: unknown = text.length === 0 ? null : JSON.parse(text);

  if (!response.ok) throw new ApiError(response.status, messageOf(payload));
  return payload as T;
}

export const api = {
  signIn: (idToken: string) =>
    request<{ user: User }>('/auth/google', {
      method: 'POST',
      body: { idToken },
    }),
  signOut: () =>
    request<{ ok: true }>('/auth/logout', { method: 'POST', body: {} }),
  me: () => request<User>('/auth/me'),
  listSpaces: () => request<Space[]>('/spaces'),
  createSpace: (input: { name: string; description: string | null }) =>
    request<Space>('/spaces', { method: 'POST', body: input }),
  updateSpace: (
    id: string,
    input: { name?: string; description?: string | null },
  ) => request<Space>(`/spaces/${id}`, { method: 'PATCH', body: input }),
  deleteSpace: (id: string) =>
    request<null>(`/spaces/${id}`, { method: 'DELETE' }),
};
