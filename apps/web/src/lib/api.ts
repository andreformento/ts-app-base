import createClient from 'openapi-fetch';
import type { paths } from '../types/api';
import type {
  CreateSpace,
  Failure,
  Space,
  UpdateSpace,
  User,
} from '../types/space';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const client = createClient<paths>({
  baseUrl: '/api',
  credentials: 'include',
});

export function messageOf(
  failure: Failure,
  fallback = 'Something went wrong.',
): string {
  const message = Array.isArray(failure.message)
    ? failure.message.join('; ')
    : failure.message;
  return message.length === 0 ? fallback : message;
}

function refused(response: Response, failure: Failure): ApiError {
  return new ApiError(response.status, messageOf(failure));
}

export const api = {
  signIn: async (idToken: string): Promise<{ user: User }> => {
    const result = await client.POST('/auth/google', { body: { idToken } });
    if (result.error !== undefined)
      throw refused(result.response, result.error);
    return result.data;
  },
  signOut: async (): Promise<void> => {
    const result = await client.POST('/auth/logout', { body: {} });
    if (result.error !== undefined)
      throw refused(result.response, result.error);
  },
  me: async (): Promise<User> => {
    const result = await client.GET('/auth/me');
    if (result.error !== undefined)
      throw refused(result.response, result.error);
    return result.data;
  },
  listSpaces: async (): Promise<Space[]> => {
    const result = await client.GET('/spaces');
    if (result.error !== undefined)
      throw refused(result.response, result.error);
    return result.data;
  },
  createSpace: async (input: CreateSpace): Promise<Space> => {
    const result = await client.POST('/spaces', { body: input });
    if (result.error !== undefined)
      throw refused(result.response, result.error);
    return result.data;
  },
  updateSpace: async (id: string, input: UpdateSpace): Promise<Space> => {
    const result = await client.PATCH('/spaces/{id}', {
      params: { path: { id } },
      body: input,
    });
    if (result.error !== undefined)
      throw refused(result.response, result.error);
    return result.data;
  },
  deleteSpace: async (id: string): Promise<void> => {
    const result = await client.DELETE('/spaces/{id}', {
      params: { path: { id } },
    });
    if (result.error !== undefined)
      throw refused(result.response, result.error);
  },
};
