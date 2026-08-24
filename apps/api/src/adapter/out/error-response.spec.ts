import { describe, expect, it } from 'vitest';
import { fromFailure } from './error-response.js';

describe('fromFailure', () => {
  it('maps space rejections to 422 with a readable message', () => {
    expect(
      fromFailure({ of: 'space', rejection: { kind: 'name-empty' } }),
    ).toEqual({
      status: 422,
      body: {
        error: { code: 'space.name-empty', message: 'Name is required.' },
      },
    });
  });

  it('includes the limit in a length message', () => {
    const rendered = fromFailure({
      of: 'space',
      rejection: { kind: 'name-too-long', max: 80 },
    });
    expect(rendered.body.error.message).toBe(
      'Name must be at most 80 characters.',
    );
  });

  it('maps both access rejections to 403, never 404', () => {
    expect(
      fromFailure({ of: 'access', rejection: { kind: 'not-a-member' } }).status,
    ).toBe(403);
    expect(
      fromFailure({
        of: 'access',
        rejection: { kind: 'role-insufficient', required: 'host' },
      }).status,
    ).toBe(403);
  });

  it('maps identity and session rejections to 401', () => {
    expect(
      fromFailure({ of: 'identity', rejection: { kind: 'expired' } }).status,
    ).toBe(401);
    expect(
      fromFailure({ of: 'session', rejection: { kind: 'revoked' } }).status,
    ).toBe(401);
  });

  it('keeps 401 messages generic so they reveal nothing', () => {
    const identity = fromFailure({
      of: 'identity',
      rejection: { kind: 'audience-not-allowed' },
    });
    expect(identity.body.error.message).toBe(
      'The provided identity was not accepted.',
    );
    expect(identity.body.error.code).toBe('identity.audience-not-allowed');
  });

  it('maps not-found to 404', () => {
    expect(fromFailure({ of: 'not-found', resource: 'space' })).toEqual({
      status: 404,
      body: {
        error: {
          code: 'not-found',
          message: 'The requested space does not exist.',
        },
      },
    });
  });

  it('emits only code and message, never internals', () => {
    const rendered = fromFailure({
      of: 'space',
      rejection: { kind: 'nothing-to-update' },
    });
    expect(Object.keys(rendered.body)).toEqual(['error']);
    expect(Object.keys(rendered.body.error).sort()).toEqual([
      'code',
      'message',
    ]);
  });
});
