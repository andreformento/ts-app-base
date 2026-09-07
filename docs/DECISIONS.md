# Decisions

Why the code is the way it is, and what was rejected on the way. Every entry
describes what is true **now**.

These are not constraints on changing the project. When the owner asks for a
change, the change happens and the entry that described the old behaviour is
rewritten in the same commit — a refactor that leaves an entry stale is not
finished. Read an entry before undoing it, so the reasoning is answered rather
than rediscovered; that is the only obligation.

An agent asked to change something does not need permission to contradict a
decision recorded here. It needs to update this file too.

## Follow the frameworks

Nest is used the way its documentation uses it: resource modules, DI, DTOs with
`class-validator`, a global `ValidationPipe`,
built-in `HttpException` subclasses, `@nestjs/config`, `@nestjs/swagger`,
`@nestjs/passport`. React is written the way React is normally written.

A previous version of this repository used a custom hexagonal architecture —
`model` / `logic` / `wire` / `adapter` / `application` / `diplomat`, with the
import matrix enforced by lint. It worked and every rule held, but it cost
about three times the code per feature and most of that bought nothing for
CRUD. It was replaced deliberately, not abandoned.

## No mocks, and rules as pure functions

The one convention that is not the framework's: business rules live in
`<feature>.rules.ts` as pure functions and are unit-tested exhaustively;
services do I/O and are covered by e2e against real containers.

Idiomatic Nest would unit-test a service by mocking `PrismaService`. That is
rejected: a mocked test proves the code calls the mock, not that the system
works. Keeping rules pure is what makes the ban affordable — without it, the
choice would be mocks or no unit tests at all.

Cost accepted: services have no unit tests, so a service bug surfaces in e2e
rather than in a fast test.

## Errors are Nest's

Throw `ForbiddenException`, `UnprocessableEntityException` and friends; Nest's
default filter renders them. There is no custom error envelope, so responses
carry `{ statusCode, message, error }`. That envelope is `src/failure.entity.ts`
and is declared once as the document's `default` response, so a client generated
from the document has a typed failure branch instead of a guess — see § Nothing
annotates what the framework infers.

Consequence: no machine-readable error code, so the web form shows a
server-side refusal in one place rather than on the field it belongs to.
Client-side validation still marks fields, because the form validates before
submitting.

## Nothing annotates what the framework infers

`@nestjs/swagger`'s CLI plugin is enabled in `nest-cli.json`. It derives the
whole OpenAPI schema from TypeScript types and the class-validator decorators,
so DTOs and entities carry **no `@ApiProperty`**. The inferred document is
richer than hand-written annotations were: it includes `minLength`, the
`enum` for a union type, and `date-time` formats.

`@IsOptional()` already skips `null` as well as `undefined`, so a DTO never
pairs it with `@ValidateIf(value !== null)`.

**Nothing it infers is annotated; what it cannot infer is declared.** Two things
it cannot infer, both declared in `src/openapi.ts` rather than in a controller:

_What a route throws._ No plugin reads a `throw` statement, so without a
declaration the document describes only success and a generated client's error
branch has type `never`. `.addGlobalResponse({ status: 'default', type:
FailureEntity })` declares Nest's envelope once, for every route. A controller
still carries no `@ApiResponse`: a per-route list of failures would be a second
copy of the guards and the service, kept current by hand.

_A union of primitives._ `FailureEntity.message` is `string | string[]` — a
string, or the list the `ValidationPipe` produces — and the plugin emits
`type: object` for it, which generates as `Record<string, never>`. That one
property carries an explicit `@ApiProperty({ oneOf: [...] })`. It is the only
`@ApiProperty` in the api, and it exists because the plugin cannot express the
type, not to restate one it can.

**The plugin runs during `nest build`, not under vitest and swc.** So the e2e
process serves a poorer document than production does, and the OpenAPI contract
is asserted in `scripts/smoke-stack.sh` against the built image instead. E2E
still checks that every route appears, which comes from the decorators and is
present either way.

## Validation

This section is about `apps/api`. For the web, see § Validation on the web.

`class-validator` DTOs plus a global `ValidationPipe` with Nest's strict
options — `transform`, `whitelist`, `forbidNonWhitelisted`. An undeclared field
is a 400, which is covered by an e2e test.

A DTO declares the whole shape of what may enter, including limits and
normalisation: `@MinLength`, `@MaxLength`, and `@Transform` to trim. Writing
those checks by hand duplicates the DTO, and the hand-written copy is invisible
to `@nestjs/swagger` — the published document would not mention an 80-character
limit that the API enforces.

Consequence accepted: a length violation answers 400 rather than 422, and those
checks are covered by e2e rather than by a unit test, because testing
`@MaxLength(80)` is testing class-validator.

`*.rules.ts` keeps what the framework cannot express: whether a patch changes
anything, how a patch merges onto what is stored, and who may do what.

## Validation on the web

The api's DTO layer is a trust boundary and it feeds `@nestjs/swagger`. A web
form has neither job: it is UX in front of a server that validates anyway. So it
uses its own framework's mechanism — `react-hook-form` register rules — and the
web imports no `class-validator`.

Reusing the api's stack there cost `class-validator`, `class-transformer`,
`reflect-metadata`, `@hookform/resolvers`, `tsDecorators` in the Vite config and
a `reflect-metadata` shim in the test setup, to express one required field and
two maximum lengths that `react-hook-form` expresses natively. Per § Follow the
frameworks, React is written the way React is normally written.

Rejected: a shared validation package across api and web. The web is expected to
be joined by a mobile client, and duplicated constants are cheaper than a
contract package binding both. `NAME_MAX` and `DESCRIPTION_MAX` are declared on
each side deliberately.

## The web's api types are generated

`apps/web/src/types/api.ts` is generated by `openapi-typescript` from
`apps/api/openapi.json`, and `apps/web/src/lib/api.ts` is an `openapi-fetch`
client typed by it. Both files are committed, and `make openapi-check` re-emits
them and fails if either was stale. CI runs it.

Before, the web hand-wrote `Space`, `User` and `Role` — a second, unverified
copy of the api's entities — and its `request<T>` ended in `return payload as T`.
The response was asserted, never proven; `createdAt` was already wrong in
spirit, `Date` on one side and `string` on the other, agreeing over JSON by
luck. Renaming a field in the api left the web compiling and failing at runtime.

Generation is cheap here because the document is already complete: per
§ Nothing annotates what the framework infers, the `@nestjs/swagger` CLI plugin
derives the whole schema from TypeScript types and the class-validator
decorators — the `Role` enum, the `date-time` formats, the maximum lengths.

The boundary is **trusted, not verified**, in the sense TkDodo gives it in
[Type-safe React Query](https://tkdodo.eu/blog/type-safe-react-query): we have
to trust that the backend returns what was agreed. That trust is only worth
something if the types describe the real contract, which a hand-typed guess did
not and a generated file does. `openapi-fetch` then typechecks the path, the
method, the path parameters, the body and the response, so no `as` is left in
the client.

Rejected: **runtime parsing at the boundary** — it needs `unknown` and a
hand-written guard per entity, for a contract the e2e tier already exercises
against the real api. Rejected: **a shared types package imported by both
apps** — it couples the two builds, and the web must stay buildable alone for a
future mobile client, which generates from the same document instead.

Two consequences, accepted. The web build depends on a committed generated
file, so CI fails when it is stale rather than when it is wrong. And a backend
that breaks its own contract produces a runtime failure in the browser — both
apps live in this repo, and `scripts/smoke-stack.sh` already checks the served
document against the running api.

Generation is not the api/web duplication kept deliberately in § Validation on
the web: that one keeps two builds independent, and this one has a single
source with many outputs. `apps/web/src/lib/space.rules.ts` still declares its
own `NAME_MAX` and `DESCRIPTION_MAX`; sourcing them from the document too is a
possible follow-up, not part of this.

## Emitting the document

The swagger CLI plugin transforms at build time, so the document has to come
from built output, not from `ts-node` over `src`. `src/emit-openapi.ts` starts
the app in Nest's **preview mode** — no provider or controller is instantiated,
so nothing connects to a database — and writes what `src/openapi.ts` builds.
`app.ts` serves that same function's output at `/docs`, so the emitted document
cannot drift from the served one.

`ConfigModule` validates the environment when `app.module.ts` is imported,
before any of that, so the script supplies a placeholder environment for the
five required variables. Emitting a schema needs no infrastructure and no
secrets.

## Routing is typed

`@tanstack/react-router`, with the tree in `src/router.tsx`.

There was no router. `main.tsx` rendered `<Home />`, `home.tsx` chose a screen
with a ternary on query state, the address bar was always `/`, and `sign-in.tsx`
read `?id_token=` out of `window.location.search` and cleared it with
`history.replaceState`. The next screen would have arrived as component state —
`useState<Space | null>` and a conditional render — which compiles and costs:
no linkable space, fatal for an invite-driven product; a back button that exits
the app instead of leaving the space; a refresh that lands on the list; and a
`display: standalone` PWA with no deep link to restore on launch.

Chosen over React Router, which is the larger ecosystem and the conventional
pick, because TanStack's routes and search params are **typed**: a parameter is
checked by the compiler instead of read out of a loose record, which is what
rule 4 and § The web's api types are generated ask for everywhere else. It is
also the same vendor as the Query client already in use.

The route tree carries a `notFoundComponent`. `docker/web/nginx.conf` serves
`index.html` for every path, so a typo'd URL reaches the app rather than a 404;
without one it would render blank. It makes no api call.

## Auth: our own tokens, either envelope

The provider proves identity; the api issues its own access token (`@nestjs/jwt`)
and a rotating refresh token stored hashed in the database, so revocation is
immediate. The passport strategy extracts the token from `Authorization: Bearer`
**or** the cookie, so a browser and a future native client share one code path
and one set of endpoints. Adding a mobile client needs one more audience in
`OIDC_AUDIENCES` and no new server code.

Role is read from the database on every request. It is never carried in a token.

## The compiler decides what leaves, not a runtime transformer

`<feature>.mapper.ts` turns a row into an entity by building an **object
literal**, field by field:

```ts
export function toSpaceEntity(space: StoredSpace, role: Role): SpaceEntity {
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    role,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}
```

TypeScript's excess-property check makes an undeclared field `error TS2353` at
build time. That is the whole guarantee, and it needs no test.

**The check fires only on a direct literal.** `{ ...row }` compiles and leaks;
so does `const entity: SpaceEntity = row`. A mapper therefore never spreads.

This replaced `plainToInstance(Entity, row, { excludeExtraneousValues: true })`
with `@Expose()` on every field and a `ClassSerializerInterceptor`. That was a
runtime whitelist whose type was a claim: the function returned `SpaceEntity`
whatever the object held, so a forgotten `@Expose` leaked silently. All three —
the decorators, the option, the interceptor — are gone, along with the unit
specs that listed an entity's fields.

One assertion survives, in e2e, and it is a different kind of claim: that a
named secret never reaches the wire. The compiler proves a _mapper_ cannot leak,
but returning a wider object — a Prisma row where an entity is declared —
compiles, because only object literals get an excess-property check. See
`docs/TESTING.md`.

A mapper also exposes a plural form (`toSpaceEntities`) so a caller never maps
inline; half the mapping in the mapper and half in the service is how they
drift.

`class-transformer` survives only where data arrives untyped at runtime:
coercing `process.env` in `config/environment.ts`, and `@Transform` trimming a
DTO field. Inbound needs a transformer; outbound already has types.

## Authorization is a guard, not a line in every service

A space-scoped route declares what it needs and `SpaceRoleGuard` enforces it:

```ts
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
@Controller('spaces')
export class SpacesController {
  @Patch(':id')
  @RequiresRole('host')
  update(...)
}
```

The guard reads the space id from the route, looks the membership up once, and
attaches the role to the request; a handler reads it with `@SpaceRole()` when it
needs to return it. The decision itself stays a pure function in
`memberships/membership.rules.ts`, so it keeps its unit tests — the guard does
the I/O, the rules decide.

**It fails closed.** A route carrying a space id with no `@RequiresRole` still
requires membership: absent metadata means `guest`, not "no check". A route with
no space id in its params is not space-scoped and passes through, so the space
id parameter must be named `id` or `spaceId`.

This replaced the same lookup-and-check written four times across two services,
with the lookup itself copy-pasted between them. A service no longer takes a
`userId` in order to look a role up.

**A role is not ownership.** The guard knows what a role may do; it has not
loaded the row, so it cannot answer "is this yours". A rule like _a guest may
delete only their own post_ is a pure function in `<feature>.rules.ts` and the
service does pass the caller's id to it. `docs/FEATURE-API.md` § Role is not
ownership.

Cost accepted: authorization now lives at the HTTP edge. A service called from
somewhere that is not a request — a job, another service — is not checked. There
is no such caller yet; when there is, the check has to move or be repeated
deliberately.

CASL was considered and deferred. It is the Nest-documented answer for richer
rules, and `PRODUCT.md` will need them — per-post location privacy is a
field-level permission and quiet moderation is a per-resource condition. For two
roles it is more machinery than it saves. Revisit when the first field-level
rule lands.

## Privacy in responses

A stranger asking for a space and a space that does not exist both answer 403
with the same message, so ids cannot be probed for existence. `ownerId` never
leaves, because the mapper cannot put it there without failing the build.

## One app factory

`createApp()` in `apps/api/src/app.ts` builds the application for production and
for the e2e harness. Global configuration is written once, so the tests exercise
what ships.

## Invitations

`PRODUCT.md` describes joining as an invite link plus host approval. What exists
is the first half: a host creates a tokenized invite, and redeeming it makes the
redeemer a guest. Single use, expires in a week.

The waiting room and the host's approval step are **not** implemented. When they
are, `Membership` gains a status and redeeming will create a pending row rather
than a guest one.

It was built now because the e2e suite needed a guest, and a test that writes a
membership row directly is testing a database rather than an API. Anything a
test needs must be reachable through an endpoint.

## The validation pipe

Registered in `createApp()` with Nest's documented strict options and nothing
else:

```ts
new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
```

An earlier version also carried `forbidUnknownValues` and a `validationError`
block; removing them left every test passing, so they went. An option no test
can distinguish is belief, not configuration. `whitelist` and
`forbidNonWhitelisted` are held up by an e2e that posts an undeclared field and
expects 400.

## Open

**The deploy target.** CI produces a container and a static bundle; nothing
depends on a platform. See `docs/DEPLOY.md`.

**i18n, offline behaviour and realtime.** `PRODUCT.md` calls for all three and
none is implemented.

**Two upgrades are held back, both upstream.** Dependencies are otherwise on
their latest stable release.

_Nest stays on 11_ — `@nestjs/swagger` 12's CLI plugin stops inferring a union
of string literals (`Role` loses its `enum`) and emits no type at all for a
number, which makes the document fail to build. Taking 12 would mean annotating
what § Nothing annotates what the framework infers says is not annotated. See
issue #53, which also records the `@nestjs/passport` 12 change that Nest 12 will
need: `PassportModule.register({ defaultStrategy: 'jwt' })` in a `@Global()`
`AuthModule`.

_TypeScript stays on 5.9_ — 7.0 ships `tsc` only, with no programmatic compiler
API, so the Nest CLI cannot run and neither can the swagger plugin the whole
document depends on; the API is expected back in 7.1. TypeScript 6 loads the CLI
but not the plugin, and its deprecation of `moduleResolution: "node"` and
`baseUrl` pulls an ESM migration of the api behind it. See issue #54.
