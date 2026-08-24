import { describe, expect, it } from 'vitest';
import { toMembership, toSession, toSpace, toUser } from './space-row.js';

const created = new Date('2026-01-01T00:00:00.000Z');
const updated = new Date('2026-01-02T00:00:00.000Z');

describe('toSpace', () => {
  const row = {
    id: 's1',
    name: 'Example Space',
    description: 'a trip',
    ownerId: 'u1',
    createdAt: created,
    updatedAt: updated,
    storageQuotaBytes: 0n,
    memberQuota: 0,
  };

  it('maps every field the domain uses', () => {
    expect(toSpace(row)).toEqual({
      id: 's1',
      name: 'Example Space',
      description: 'a trip',
      ownerId: 'u1',
      createdAt: created,
      updatedAt: updated,
    });
  });

  it('carries a null description through', () => {
    expect(toSpace({ ...row, description: null }).description).toBe(null);
  });

  it('drops storage columns the domain does not model', () => {
    expect(Object.keys(toSpace(row)).sort()).toEqual([
      'createdAt',
      'description',
      'id',
      'name',
      'ownerId',
      'updatedAt',
    ]);
  });
});

describe('toMembership', () => {
  it('maps the composite key and the role', () => {
    expect(
      toMembership({
        userId: 'u1',
        spaceId: 's1',
        role: 'host',
        createdAt: created,
      }),
    ).toEqual({
      userId: 'u1',
      spaceId: 's1',
      role: 'host',
    });
  });

  it('preserves the guest role rather than defaulting it', () => {
    const membership = toMembership({
      userId: 'u2',
      spaceId: 's1',
      role: 'guest',
      createdAt: created,
    });
    expect(membership.role).toBe('guest');
  });
});

describe('toUser', () => {
  const row = {
    id: 'u1',
    subject: 'subject-1',
    email: 'person@example.test',
    name: 'A Person',
    pictureUrl: 'https://pic.test/a.png',
    createdAt: created,
  };

  it('maps every field', () => {
    expect(toUser(row)).toEqual({
      id: 'u1',
      subject: 'subject-1',
      email: 'person@example.test',
      name: 'A Person',
      pictureUrl: 'https://pic.test/a.png',
    });
  });

  it('carries a null picture through', () => {
    expect(toUser({ ...row, pictureUrl: null }).pictureUrl).toBe(null);
  });
});

describe('toSession', () => {
  const row = {
    id: 'sess-1',
    userId: 'u1',
    tokenHash: 'hash',
    expiresAt: updated,
    revokedAt: null,
    createdAt: created,
  };

  it('maps every field', () => {
    expect(toSession(row)).toEqual({
      id: 'sess-1',
      userId: 'u1',
      tokenHash: 'hash',
      expiresAt: updated,
      revokedAt: null,
    });
  });

  it('preserves a revocation timestamp, which is what makes revocation immediate', () => {
    expect(toSession({ ...row, revokedAt: created }).revokedAt).toEqual(
      created,
    );
  });
});
