import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startHarness } from './harness';
import type { Harness } from './harness';
import { call } from './client';

type Session = { accessToken: string; user: { id: string } };
type Space = {
  id: string;
  name: string;
  description: string | null;
  role: string;
};
type Failure = { statusCode: number; message: string | string[] };

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 300_000);

afterAll(async () => {
  await harness.stop();
});

describe('POST /spaces', () => {
  it('creates a space and makes the creator its host', async () => {
    const auth = await signIn();
    const response = await call<Space>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'Example Space', description: 'notes' },
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Example Space');
    expect(response.body.role).toBe('host');
  });

  it('never exposes ownerId or any undeclared field', async () => {
    const auth = await signIn();
    const response = await call<Space>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'Example Space' },
    });
    expect(Object.keys(response.body).sort()).toEqual([
      'createdAt',
      'description',
      'id',
      'name',
      'role',
      'updatedAt',
    ]);
  });

  it('refuses a name that is only whitespace, and one over the limit', async () => {
    const auth = await signIn();
    const empty = await call<Failure>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: '   ' },
    });
    expect(empty.status).toBe(400);
    expect(String(empty.body.message)).toContain('Name is required');

    const long = await call<Failure>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'a'.repeat(81) },
    });
    expect(long.status).toBe(400);
    expect(String(long.body.message)).toContain('80');
  });

  it('trims the name it stores', async () => {
    const auth = await signIn();
    const response = await call<Space>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: '  Padded Space  ' },
    });
    expect(response.body.name).toBe('Padded Space');
  });

  it('stores a blank description as null', async () => {
    const auth = await signIn();
    const response = await call<Space>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'Example Space', description: '   ' },
    });
    expect(response.body.description).toBe(null);
  });

  it('refuses a body carrying a field the contract does not declare', async () => {
    const auth = await signIn();
    const response = await call<Failure>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'Example Space', ownerId: 'someone-else' },
    });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('ownerId');
  });

  it('refuses an anonymous caller', async () => {
    const response = await call(harness.url, '/spaces', {
      method: 'POST',
      body: { name: 'x' },
    });
    expect(response.status).toBe(401);
  });
});

describe('GET /spaces', () => {
  it('lists only spaces the caller belongs to', async () => {
    const mine = await signIn();
    const theirs = await signIn();
    await create(mine.accessToken, 'Mine');
    await create(theirs.accessToken, 'Theirs');

    const response = await call<Space[]>(harness.url, '/spaces', {
      token: mine.accessToken,
    });
    expect(response.body.map((space) => space.name)).toEqual(['Mine']);
  });

  it('returns an empty list rather than an error', async () => {
    const auth = await signIn();
    const response = await call<Space[]>(harness.url, '/spaces', {
      token: auth.accessToken,
    });
    expect(response.body).toEqual([]);
  });
});

describe('GET /spaces/:id', () => {
  it('returns a space to its host and to a guest, with their own role', async () => {
    const host = await signIn();
    const guest = await signIn();
    const created = await create(host.accessToken, 'Example Space');
    await invite(host, created.id, guest);

    const asHost = await call<Space>(harness.url, `/spaces/${created.id}`, {
      token: host.accessToken,
    });
    const asGuest = await call<Space>(harness.url, `/spaces/${created.id}`, {
      token: guest.accessToken,
    });

    expect(asHost.body.role).toBe('host');
    expect(asGuest.body.role).toBe('guest');
  });

  it('denies a stranger with 403, and answers the same for a space that does not exist', async () => {
    const host = await signIn();
    const stranger = await signIn();
    const created = await create(host.accessToken, 'Example Space');

    const denied = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      token: stranger.accessToken,
    });
    const absent = await call<Failure>(
      harness.url,
      '/spaces/00000000-0000-0000-0000-000000000000',
      { token: stranger.accessToken },
    );

    expect(denied.status).toBe(403);
    expect(absent.status).toBe(403);
    expect(denied.body.message).toEqual(absent.body.message);
  });
});

describe('PATCH /spaces/:id', () => {
  it('lets a host rename a space, leaving the description alone', async () => {
    const auth = await signIn();
    const created = await create(auth.accessToken, 'Example Space', 'notes');

    const response = await call<Space>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: auth.accessToken,
      body: { name: 'Renamed Space' },
    });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Renamed Space');
    expect(response.body.description).toBe('notes');
  });

  it('clears the description when it is patched to null', async () => {
    const auth = await signIn();
    const created = await create(auth.accessToken, 'Example Space', 'notes');

    const response = await call<Space>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: auth.accessToken,
      body: { description: null },
    });
    expect(response.body.description).toBe(null);
  });

  it('stops a guest editing', async () => {
    const host = await signIn();
    const guest = await signIn();
    const created = await create(host.accessToken, 'Example Space');
    await invite(host, created.id, guest);

    const response = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: guest.accessToken,
      body: { name: 'Hijacked' },
    });
    expect(response.status).toBe(403);
    expect(String(response.body.message)).toContain('role does not allow');
  });

  it('refuses a patch that changes nothing', async () => {
    const auth = await signIn();
    const created = await create(auth.accessToken, 'Example Space');

    const response = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: auth.accessToken,
      body: {},
    });
    expect(response.status).toBe(422);
    expect(String(response.body.message)).toContain('at least one field');
  });
});

describe('DELETE /spaces/:id', () => {
  it('lets a host delete, after which it is gone', async () => {
    const auth = await signIn();
    const created = await create(auth.accessToken, 'Example Space');

    const deleted = await call(harness.url, `/spaces/${created.id}`, {
      method: 'DELETE',
      token: auth.accessToken,
    });
    expect(deleted.status).toBe(204);

    const after = await call<Space[]>(harness.url, '/spaces', {
      token: auth.accessToken,
    });
    expect(after.body).toEqual([]);
  });

  it('stops a guest deleting', async () => {
    const host = await signIn();
    const guest = await signIn();
    const created = await create(host.accessToken, 'Example Space');
    await invite(host, created.id, guest);

    const response = await call(harness.url, `/spaces/${created.id}`, {
      method: 'DELETE',
      token: guest.accessToken,
    });
    expect(response.status).toBe(403);
  });
});

describe('invitations', () => {
  it('lets a host invite someone, who becomes a guest', async () => {
    const host = await signIn();
    const guest = await signIn();
    const created = await create(host.accessToken, 'Example Space');

    await invite(host, created.id, guest);

    const seen = await call<Space>(harness.url, `/spaces/${created.id}`, {
      token: guest.accessToken,
    });
    expect(seen.status).toBe(200);
    expect(seen.body.role).toBe('guest');
  });

  it('stops a guest inviting anyone else', async () => {
    const host = await signIn();
    const guest = await signIn();
    const outsider = await signIn();
    const created = await create(host.accessToken, 'Example Space');
    await invite(host, created.id, guest);

    const response = await call<Failure>(
      harness.url,
      `/spaces/${created.id}/invites`,
      {
        method: 'POST',
        token: guest.accessToken,
      },
    );
    expect(response.status).toBe(403);
    expect(String(response.body.message)).toContain('role does not allow');

    const denied = await call(harness.url, `/spaces/${created.id}`, {
      token: outsider.accessToken,
    });
    expect(denied.status).toBe(403);
  });

  it('stops a stranger inviting into a space they cannot see', async () => {
    const host = await signIn();
    const stranger = await signIn();
    const created = await create(host.accessToken, 'Example Space');

    const response = await call<Failure>(
      harness.url,
      `/spaces/${created.id}/invites`,
      {
        method: 'POST',
        token: stranger.accessToken,
      },
    );
    expect(response.status).toBe(403);
  });

  it('refuses an invitation that was already redeemed', async () => {
    const host = await signIn();
    const guest = await signIn();
    const other = await signIn();
    const created = await create(host.accessToken, 'Example Space');

    const invitation = await call<{ token: string }>(
      harness.url,
      `/spaces/${created.id}/invites`,
      { method: 'POST', token: host.accessToken },
    );
    await call(harness.url, `/invites/${invitation.body.token}/redeem`, {
      method: 'POST',
      token: guest.accessToken,
    });

    const replay = await call<Failure>(
      harness.url,
      `/invites/${invitation.body.token}/redeem`,
      {
        method: 'POST',
        token: other.accessToken,
      },
    );
    expect(replay.status).toBe(404);
  });

  it('refuses an invitation that does not exist', async () => {
    const person = await signIn();
    const response = await call(harness.url, '/invites/not-a-token/redeem', {
      method: 'POST',
      token: person.accessToken,
    });
    expect(response.status).toBe(404);
  });

  it('refuses an anonymous redemption', async () => {
    const response = await call(harness.url, '/invites/whatever/redeem', {
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('reports ok while the database is reachable', async () => {
    const response = await call<{ status: string }>(harness.url, '/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('GET /openapi.json', () => {
  it('documents every route', async () => {
    const response = await call<{ paths: Record<string, unknown> }>(
      harness.url,
      '/openapi.json',
    );
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.paths).sort()).toEqual([
      '/auth/google',
      '/auth/logout',
      '/auth/me',
      '/auth/refresh',
      '/health',
      '/invites/{token}/redeem',
      '/spaces',
      '/spaces/{id}',
      '/spaces/{id}/invites',
    ]);
  });
});

async function signIn(): Promise<Session> {
  return harness.signIn();
}

async function invite(
  host: Session,
  spaceId: string,
  guest: Session,
): Promise<void> {
  const created = await call<{ token: string }>(
    harness.url,
    `/spaces/${spaceId}/invites`,
    {
      method: 'POST',
      token: host.accessToken,
    },
  );
  const redeemed = await call(
    harness.url,
    `/invites/${created.body.token}/redeem`,
    {
      method: 'POST',
      token: guest.accessToken,
    },
  );
  if (redeemed.status !== 201) {
    throw new Error(
      `Could not redeem the invitation: ${String(redeemed.status)}`,
    );
  }
}

async function create(
  token: string,
  name: string,
  description?: string,
): Promise<Space> {
  const response = await call<Space>(harness.url, '/spaces', {
    method: 'POST',
    token,
    body: description === undefined ? { name } : { name, description },
  });
  return response.body;
}
