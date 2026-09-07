# Adding a feature to the api

Everything needed to write a resource, with the real signatures. `src/spaces`
and `src/invites` are the worked examples; copy them.

## Routes

A resource owned by a space is nested under it, and the parameter is named
`spaceId` so `SpaceRoleGuard` finds it:

    POST   /spaces/:spaceId/posts
    GET    /spaces/:spaceId/posts
    DELETE /spaces/:spaceId/posts/:postId

The guard looks for `spaceId` first, then `id`. A route on the space itself
therefore uses `:id` (`PATCH /spaces/:id`). A route with neither is not
space-scoped and the guard lets it through.

## The pieces, with their signatures

```ts
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequiresRole } from '../memberships/requires-role.decorator';
import { SpaceRole } from '../memberships/space-role.decorator';
import { SpaceRoleGuard } from '../memberships/space-role.guard';
import type { Role } from '../memberships/membership.rules';
import type { SessionUser } from '../auth/session-user';

type Role = 'host' | 'guest';

type SessionUser = {
  readonly id: string;
  readonly sessionId: string;
  readonly email: string;
  readonly name: string;
  readonly pictureUrl: string | null;
};

@CurrentUser() user: SessionUser   // who is calling
@SpaceRole()  role: Role           // their role in the space of this route
@RequiresRole('host')              // 'host' | 'guest'; absent means 'guest'
```

`@SpaceRole()` is only populated when `SpaceRoleGuard` ran and the route carries
a space parameter.

## Role is not ownership

The guard answers "may this role do this here". It cannot answer "is this yours"
— ownership is a property of a row, and the guard has not loaded it.

A rule like _a guest may delete only their own post_ is a pure function in
`<feature>.rules.ts`, called by the service, which needs the caller's id:

```ts
export function mayDeletePost(
  role: Role,
  viewerId: string,
  authorId: string,
): boolean {
  return role === 'host' || viewerId === authorId;
}
```

So a service does take a `userId` when ownership is part of the decision. It
does not take one merely to look a role up — that is the guard's job.

## The order

1. `prisma/schema.prisma` — the model, then
   `pnpm --filter @appname/api prisma:migrate`
2. `<name>.rules.ts` + `.spec.ts` — pure rules, tested first
3. `dto/` — `class-validator` decorators. Limits and trimming belong here
4. `entities/` — plain classes, no decorators; the plugin infers the schema.
   The api's one `@ApiProperty` is in `src/failure.entity.ts` — do not add
   another
5. `<name>.mapper.ts` — object literal, never a spread. Add the plural form
6. `<name>.service.ts` — I/O and orchestration
7. `<name>.controller.ts` — thin, guarded
8. `<name>.module.ts` — **and register it in `src/app.module.ts`**
9. `test/e2e/<name>.e2e-spec.ts`
10. `make openapi` — re-emits `apps/api/openapi.json` and regenerates
    `apps/web/src/types/api.ts`. Commit both; CI fails when they are stale
11. If the feature adds a route a client depends on, add an assertion to
    `scripts/smoke-stack.sh`, which runs against the built image

## Writing the e2e

`startHarness()` returns:

```ts
type Harness = {
  app: INestApplication;
  url: string; // base url, already listening
  idToken: (claims: TokenClaims) => Promise<string>;
  signIn: (subject?: string) => Promise<Signed>; // fresh identity by default
  stop: () => Promise<void>;
};

type Signed = {
  accessToken: string;
  refreshToken: string;
  cookies: readonly string[];
  user: { id: string; email: string; name: string };
};
```

Every call to `signIn()` mints a new subject, so tests never share data and
nothing is truncated between them.

To get a **guest**, use the real endpoints — a test never writes to the
database:

```ts
const host = await harness.signIn();
const guest = await harness.signIn();
const space = await create(host.accessToken, 'Example Space');

const invite = await call<{ token: string }>(
  harness.url,
  `/spaces/${space.id}/invites`,
  {
    method: 'POST',
    token: host.accessToken,
  },
);
await call(harness.url, `/invites/${invite.body.token}/redeem`, {
  method: 'POST',
  token: guest.accessToken,
});
```

`call(url, path, { method, body, token, cookie })` is in `test/e2e/client.ts` and
returns `{ status, body, cookies }`.

The shapes a response comes back as live in `test/e2e/responses.ts` — `Session`,
`Space`, `Invite`, `Failure`. Import them; do not redeclare a response type
inside a spec.

## Status codes to match

    400  a DTO refused the body, or it carried an undeclared field
    401  no session, or a dead one
    403  not a member, or the role is insufficient
    422  a rule in <feature>.rules.ts refused
    204  a successful delete

A member and a stranger must not be able to tell a missing space from one they
cannot see: both answer 403 with the same message.
