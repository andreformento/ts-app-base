import type { Space, SpaceDraft, SpaceId } from '../../model/space.js';
import type { User } from '../../model/user.js';
import { toSpace, toUser } from '../../adapter/in/space.js';
import { fromDraft, fromPatch } from '../../adapter/out/space.js';
import {
  ErrorResponse,
  SpaceListResponse,
  SpaceResponse,
  UserResponse,
} from '../../wire/in/space-response.js';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(
  path: string,
  init: { method?: string; body?: string } = {},
): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
  });

  const text = await response.text();
  const payload: unknown = text.length === 0 ? null : JSON.parse(text);

  if (!response.ok) {
    const parsed = ErrorResponse.safeParse(payload);
    throw parsed.success
      ? new ApiError(
          response.status,
          parsed.data.error.code,
          parsed.data.error.message,
        )
      : new ApiError(response.status, 'unknown', 'Something went wrong.');
  }
  return payload;
}

export async function signIn(idToken: string): Promise<User> {
  const payload = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  return toUser(UserResponse.parse((payload as { user: unknown }).user));
}

export async function signOut(): Promise<void> {
  await request('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function fetchMe(): Promise<User> {
  return toUser(UserResponse.parse(await request('/auth/me')));
}

export async function fetchSpaces(): Promise<readonly Space[]> {
  const payload = await request('/spaces');
  return SpaceListResponse.parse(payload).items.map(toSpace);
}

export async function createSpace(draft: SpaceDraft): Promise<Space> {
  const payload = await request('/spaces', {
    method: 'POST',
    body: JSON.stringify(fromDraft(draft)),
  });
  return toSpace(SpaceResponse.parse(payload));
}

export async function updateSpace(
  id: SpaceId,
  patch: Partial<SpaceDraft>,
): Promise<Space> {
  const payload = await request(`/spaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fromPatch(patch)),
  });
  return toSpace(SpaceResponse.parse(payload));
}

export async function deleteSpace(id: SpaceId): Promise<void> {
  await request(`/spaces/${id}`, { method: 'DELETE' });
}
