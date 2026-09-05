import { describe, expect, it } from 'vitest';
import { mayManage, messageOf, roleLabel } from './space.rules';

describe('mayManage', () => {
  it('is true only for a host', () => {
    expect(mayManage({ role: 'host' })).toBe(true);
    expect(mayManage({ role: 'guest' })).toBe(false);
  });
});

describe('roleLabel', () => {
  it('names both roles for display', () => {
    expect(roleLabel('host')).toBe('Host');
    expect(roleLabel('guest')).toBe('Guest');
  });
});

describe('messageOf', () => {
  it('reads the message the api sent', () => {
    expect(messageOf({ message: 'Name is required.' })).toBe(
      'Name is required.',
    );
  });

  it('joins the list form the validation pipe produces', () => {
    expect(messageOf({ message: ['name must be a string', 'too short'] })).toBe(
      'name must be a string; too short',
    );
  });

  it('falls back when there is nothing usable', () => {
    expect(messageOf(null)).toBe('Something went wrong.');
    expect(messageOf({})).toBe('Something went wrong.');
    expect(messageOf({ message: [] })).toBe('Something went wrong.');
    expect(messageOf('nope')).toBe('Something went wrong.');
  });

  it('uses the fallback the caller supplies', () => {
    expect(messageOf({}, 'Could not load.')).toBe('Could not load.');
  });
});
