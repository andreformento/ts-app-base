import type { ZodType } from 'zod';
import type { ParseRejection } from '../../model/parse.js';
import type { Result } from '../../model/result.js';

export function parseWire<T>(
  schema: ZodType<T>,
  input: unknown,
): Result<T, ParseRejection> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };

  return {
    ok: false,
    error: {
      problems: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    },
  };
}
