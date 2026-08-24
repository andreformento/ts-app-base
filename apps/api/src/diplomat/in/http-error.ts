import { HttpException } from '@nestjs/common';
import type { Failure } from '../../model/failure.js';
import { fromFailure } from '../../adapter/out/error-response.js';
import { parseWire } from '../../adapter/in/parse.js';
import type { ZodType } from 'zod';

export class FailureException extends HttpException {
  constructor(failure: Failure) {
    const rendered = fromFailure(failure);
    super(rendered.body, rendered.status);
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = parseWire(schema, body);
  if (!parsed.ok)
    throw new FailureException({ of: 'parse', rejection: parsed.error });
  return parsed.value;
}
