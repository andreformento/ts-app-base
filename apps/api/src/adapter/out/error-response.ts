import type { Failure } from '../../model/failure.js';
import type { SpaceRejection } from '../../model/space.js';
import { ErrorResponse } from '../../wire/out/error-response.js';

export function fromFailure(failure: Failure): {
  status: number;
  body: ErrorResponse;
} {
  const rendered = describe(failure);
  return {
    status: rendered.status,
    body: ErrorResponse.parse({
      error: { code: rendered.code, message: rendered.message },
    }),
  };
}

function describe(failure: Failure): {
  status: number;
  code: string;
  message: string;
} {
  switch (failure.of) {
    case 'space':
      return {
        status: 422,
        code: `space.${failure.rejection.kind}`,
        message: spaceMessage(failure.rejection),
      };
    case 'access':
      return failure.rejection.kind === 'not-a-member'
        ? {
            status: 403,
            code: 'access.not-a-member',
            message: 'You are not a member of this space.',
          }
        : {
            status: 403,
            code: 'access.role-insufficient',
            message: 'Your role does not allow this action.',
          };
    case 'identity':
      return {
        status: 401,
        code: `identity.${failure.rejection.kind}`,
        message: 'The provided identity was not accepted.',
      };
    case 'session':
      return {
        status: 401,
        code: `session.${failure.rejection.kind}`,
        message: 'Your session is no longer valid.',
      };
    case 'not-found':
      return {
        status: 404,
        code: 'not-found',
        message: `The requested ${failure.resource} does not exist.`,
      };
    case 'parse':
      return {
        status: 400,
        code: 'request.invalid',
        message: failure.rejection.problems
          .map((p) => `${p.path}: ${p.message}`)
          .join('; '),
      };
  }
}

function spaceMessage(rejection: SpaceRejection): string {
  switch (rejection.kind) {
    case 'name-empty':
      return 'Name is required.';
    case 'name-too-long':
      return `Name must be at most ${String(rejection.max)} characters.`;
    case 'description-too-long':
      return `Description must be at most ${String(rejection.max)} characters.`;
    case 'nothing-to-update':
      return 'Provide at least one field to update.';
  }
}
