import { z } from 'zod';
import { AuthenticateRequest, RefreshRequest } from '../in/auth-request.js';
import { CreateSpaceRequest, UpdateSpaceRequest } from '../in/space-request.js';
import { AuthResponse, UserResponse } from './auth-response.js';
import { ErrorResponse } from './error-response.js';
import { SpaceListResponse, SpaceResponse } from './space-response.js';

type Operation = {
  readonly method: 'get' | 'post' | 'patch' | 'delete';
  readonly path: string;
  readonly summary: string;
  readonly secured: boolean;
  readonly request: z.ZodType | null;
  readonly responses: readonly {
    readonly status: number;
    readonly schema: z.ZodType | null;
  }[];
};

const FAILURES = [401, 403, 404, 422] as const;

export const OPERATIONS: readonly Operation[] = [
  {
    method: 'post',
    path: '/auth/google',
    summary: 'Exchange a provider id token for a session',
    secured: false,
    request: AuthenticateRequest,
    responses: [{ status: 201, schema: AuthResponse }],
  },
  {
    method: 'post',
    path: '/auth/refresh',
    summary: 'Rotate the refresh token',
    secured: false,
    request: RefreshRequest,
    responses: [{ status: 201, schema: AuthResponse }],
  },
  {
    method: 'post',
    path: '/auth/logout',
    summary: 'Revoke the session',
    secured: false,
    request: RefreshRequest,
    responses: [{ status: 201, schema: null }],
  },
  {
    method: 'get',
    path: '/auth/me',
    summary: 'The signed-in user',
    secured: true,
    request: null,
    responses: [{ status: 200, schema: UserResponse }],
  },
  {
    method: 'get',
    path: '/health',
    summary: 'Readiness, including database reachability',
    secured: false,
    request: null,
    responses: [{ status: 200, schema: null }],
  },
  {
    method: 'get',
    path: '/openapi.json',
    summary: 'This document',
    secured: false,
    request: null,
    responses: [{ status: 200, schema: null }],
  },
  {
    method: 'post',
    path: '/spaces',
    summary: 'Create a space and host it',
    secured: true,
    request: CreateSpaceRequest,
    responses: [{ status: 201, schema: SpaceResponse }],
  },
  {
    method: 'get',
    path: '/spaces',
    summary: 'Spaces the caller belongs to',
    secured: true,
    request: null,
    responses: [{ status: 200, schema: SpaceListResponse }],
  },
  {
    method: 'get',
    path: '/spaces/{id}',
    summary: 'One space',
    secured: true,
    request: null,
    responses: [{ status: 200, schema: SpaceResponse }],
  },
  {
    method: 'patch',
    path: '/spaces/{id}',
    summary: 'Edit a space',
    secured: true,
    request: UpdateSpaceRequest,
    responses: [{ status: 200, schema: SpaceResponse }],
  },
  {
    method: 'delete',
    path: '/spaces/{id}',
    summary: 'Delete a space',
    secured: true,
    request: null,
    responses: [{ status: 204, schema: null }],
  },
];

function schemaOf(schema: z.ZodType): unknown {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' });
}

function bodyOf(schema: z.ZodType | null): Record<string, unknown> | undefined {
  if (schema === null) return undefined;
  return {
    required: true,
    content: { 'application/json': { schema: schemaOf(schema) } },
  };
}

function responsesOf(operation: Operation): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const response of operation.responses) {
    responses[String(response.status)] =
      response.schema === null
        ? { description: 'Success' }
        : {
            description: 'Success',
            content: {
              'application/json': { schema: schemaOf(response.schema) },
            },
          };
  }
  for (const status of FAILURES) {
    responses[String(status)] = {
      description: 'Failure',
      content: { 'application/json': { schema: schemaOf(ErrorResponse) } },
    };
  }
  return responses;
}

export function openApiDocument(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of OPERATIONS) {
    const parameters = [...operation.path.matchAll(/\{(\w+)\}/g)].map(
      (match) => ({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
      }),
    );

    const entry: Record<string, unknown> = {
      summary: operation.summary,
      responses: responsesOf(operation),
    };
    if (parameters.length > 0) entry['parameters'] = parameters;
    const body = bodyOf(operation.request);
    if (body !== undefined) entry['requestBody'] = body;
    if (operation.secured) entry['security'] = [{ bearer: [] }, { cookie: [] }];

    paths[operation.path] = {
      ...paths[operation.path],
      [operation.method]: entry,
    };
  }

  return {
    openapi: '3.0.3',
    info: { title: 'appname', version: '0.0.1' },
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer' },
        cookie: { type: 'apiKey', in: 'cookie', name: 'appname_access' },
      },
    },
    paths,
  };
}
