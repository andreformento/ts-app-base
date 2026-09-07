import { describe, expect, it } from 'vitest';
import { messageOf } from './api';

describe('messageOf', () => {
  it('reads the message the api sent', () => {
    expect(messageOf({ statusCode: 400, message: 'Name is required.' })).toBe(
      'Name is required.',
    );
  });

  it('joins the list form the validation pipe produces', () => {
    expect(
      messageOf({
        statusCode: 400,
        message: ['name must be a string', 'too short'],
      }),
    ).toBe('name must be a string; too short');
  });

  it('falls back when the api sent nothing usable', () => {
    expect(messageOf({ statusCode: 500, message: '' })).toBe(
      'Something went wrong.',
    );
    expect(messageOf({ statusCode: 500, message: [] })).toBe(
      'Something went wrong.',
    );
  });

  it('uses the fallback the caller supplies', () => {
    expect(messageOf({ statusCode: 500, message: '' }, 'Could not load.')).toBe(
      'Could not load.',
    );
  });
});
