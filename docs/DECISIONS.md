# Decisions

Settled. Do not relitigate; add a superseding entry instead.

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
carry `{ statusCode, message, error }`.

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

**The plugin runs during `nest build`, not under vitest and swc.** So the e2e
process serves a poorer document than production does, and the OpenAPI contract
is asserted in `scripts/smoke-stack.sh` against the built image instead. E2E
still checks that every route appears, which comes from the decorators and is
present either way.

## Validation

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
service does pass the caller's id to it. `docs/FEATURE.md` § Role is not
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
