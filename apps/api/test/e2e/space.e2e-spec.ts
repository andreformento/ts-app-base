import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WEB_CLIENT, type Harness, startHarness } from './harness.js';
import { call } from './client.js';

type Auth = { accessToken: string; refreshToken: string; user: { id: string } };
type Space = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  createdAt: string;
};
type SpaceList = { items: Space[] };
type Failure = { error: { code: string; message: string } };

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 300_000);

afterAll(async () => {
  await harness.stop();
});

beforeEach(async () => {
  await harness.reset();
});

describe('POST /spaces', () => {
  it('creates a space and makes the creator its host', async () => {
    const auth = await signIn('person-1');
    const response = await call<Space>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'Example Space', description: 'a trip' },
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Example Space');
    expect(response.body.role).toBe('host');
  });

  it('never exposes ownerId or any undeclared field', async () => {
    const auth = await signIn('person-1');
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

  it('rejects an empty name with the domain code', async () => {
    const auth = await signIn('person-1');
    const response = await call<Failure>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: '   ' },
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('space.name-empty');
  });

  it('rejects a name over the limit', async () => {
    const auth = await signIn('person-1');
    const response = await call<Failure>(harness.url, '/spaces', {
      method: 'POST',
      token: auth.accessToken,
      body: { name: 'a'.repeat(81) },
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('space.name-too-long');
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
    const mine = await signIn('person-1');
    const theirs = await signIn('person-2');
    await create(mine.accessToken, 'Mine');
    await create(theirs.accessToken, 'Theirs');

    const response = await call<SpaceList>(harness.url, '/spaces', {
      token: mine.accessToken,
    });
    expect(response.body.items.map((i) => i.name)).toEqual(['Mine']);
  });

  it('returns an empty list, not an error, for someone with no spaces', async () => {
    const auth = await signIn('person-1');
    const response = await call<SpaceList>(harness.url, '/spaces', {
      token: auth.accessToken,
    });
    expect(response.body).toEqual({ items: [] });
  });
});

describe('GET /spaces/:id', () => {
  it('returns a space to its host', async () => {
    const auth = await signIn('person-1');
    const created = await create(auth.accessToken, 'Example Space');
    const response = await call<Space>(harness.url, `/spaces/${created.id}`, {
      token: auth.accessToken,
    });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('host');
  });

  it('returns a space to a guest, with the guest role', async () => {
    const host = await signIn('person-1');
    const guest = await signIn('person-2');
    const created = await create(host.accessToken, 'Example Space');
    await harness.addMember(created.id, guest.user.id, 'guest');

    const response = await call<Space>(harness.url, `/spaces/${created.id}`, {
      token: guest.accessToken,
    });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('guest');
  });

  it('denies a non-member with 403, never leaking existence via 404', async () => {
    const host = await signIn('person-1');
    const stranger = await signIn('person-2');
    const created = await create(host.accessToken, 'Example Space');

    const response = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      token: stranger.accessToken,
    });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('access.not-a-member');
  });

  it('answers 403 for a space that does not exist at all, for the same reason', async () => {
    const auth = await signIn('person-1');
    const response = await call(
      harness.url,
      '/spaces/00000000-0000-0000-0000-000000000000',
      {
        token: auth.accessToken,
      },
    );
    expect(response.status).toBe(403);
  });
});

describe('PATCH /spaces/:id', () => {
  it('lets a host rename a space, leaving the description alone', async () => {
    const auth = await signIn('person-1');
    const created = await create(auth.accessToken, 'Example Space', 'a trip');

    const response = await call<Space>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: auth.accessToken,
      body: { name: 'Renamed Space' },
    });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Renamed Space');
    expect(response.body.description).toBe('a trip');
  });

  it('stops a guest editing', async () => {
    const host = await signIn('person-1');
    const guest = await signIn('person-2');
    const created = await create(host.accessToken, 'Example Space');
    await harness.addMember(created.id, guest.user.id, 'guest');

    const response = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: guest.accessToken,
      body: { name: 'Hijacked' },
    });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('access.role-insufficient');
  });

  it('rejects a patch that changes nothing', async () => {
    const auth = await signIn('person-1');
    const created = await create(auth.accessToken, 'Example Space');
    const response = await call<Failure>(harness.url, `/spaces/${created.id}`, {
      method: 'PATCH',
      token: auth.accessToken,
      body: {},
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('space.nothing-to-update');
  });
});

describe('DELETE /spaces/:id', () => {
  it('lets a host delete, after which it is gone', async () => {
    const auth = await signIn('person-1');
    const created = await create(auth.accessToken, 'Example Space');

    const deleted = await call(harness.url, `/spaces/${created.id}`, {
      method: 'DELETE',
      token: auth.accessToken,
    });
    expect(deleted.status).toBe(204);

    const after = await call<SpaceList>(harness.url, '/spaces', {
      token: auth.accessToken,
    });
    expect(after.body.items).toEqual([]);
  });

  it('stops a guest deleting', async () => {
    const host = await signIn('person-1');
    const guest = await signIn('person-2');
    const created = await create(host.accessToken, 'Example Space');
    await harness.addMember(created.id, guest.user.id, 'guest');

    const response = await call(harness.url, `/spaces/${created.id}`, {
      method: 'DELETE',
      token: guest.accessToken,
    });
    expect(response.status).toBe(403);
  });
});

describe('GET /health', () => {
  it('reports ok while the database is reachable', async () => {
    const response = await call<{ status: string }>(harness.url, '/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

async function signIn(subject: string): Promise<Auth> {
  const idToken = await harness.identity.idToken({
    subject,
    audience: WEB_CLIENT,
  });
  const response = await call<Auth>(harness.url, '/auth/google', {
    method: 'POST',
    body: { idToken },
  });
  return response.body;
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
