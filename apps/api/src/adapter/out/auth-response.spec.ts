import { describe, expect, it } from 'vitest';
import { fromTokens, fromUser } from './auth-response.js';
import type { User } from '../../model/user.js';

const user: User = {
  id: 'u1',
  subject: 'subject-1',
  email: 'person@example.com',
  name: 'A Person',
  pictureUrl: null,
};

describe('fromUser', () => {
  it('maps every exposed field', () => {
    expect(fromUser(user)).toEqual({
      id: 'u1',
      email: 'person@example.com',
      name: 'A Person',
      pictureUrl: null,
    });
  });

  it('never exposes the provider subject', () => {
    expect(Object.keys(fromUser(user))).not.toContain('subject');
  });
});

describe('fromTokens', () => {
  it('returns both tokens in the body so a native client can store them', () => {
    const response = fromTokens(user, 'access-1', 'refresh-1');
    expect(response.accessToken).toBe('access-1');
    expect(response.refreshToken).toBe('refresh-1');
    expect(response.user.id).toBe('u1');
  });
});
