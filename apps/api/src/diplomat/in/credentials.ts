import type { Request } from 'express';
import type { Credentials } from '../../model/credentials.js';

export function credentialsOf(request: Request): Credentials {
  const raw: unknown = (request as { cookies?: unknown }).cookies;
  const cookies: Record<string, string> = {};
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') cookies[key] = value;
    }
  }
  const header = request.headers.authorization;
  return { authorization: typeof header === 'string' ? header : null, cookies };
}
