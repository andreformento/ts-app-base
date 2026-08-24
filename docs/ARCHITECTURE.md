# Backend architecture

Applies to `apps/api`. Normative: MUST / MUST NOT are enforced by lint and CI.

## Shape

Layer-first, feature-as-filename. Dependencies point inward toward `model`.

    apps/api/src/
      model/<feature>.ts             internal types.        no tests
      logic/<feature>.ts             pure functions.        unit tests REQUIRED
      wire/in/<input>.ts             inbound schemas.       no tests
      wire/out/<output>.ts           outbound schemas.      no tests
      wire/db/schema.prisma          database shape.        no tests
      wire/db/migrations/            generated SQL.         no tests
      adapter/in/<name>.ts           wire/in  -> model.     unit tests REQUIRED
      adapter/out/<name>.ts          model -> wire/out.     unit tests REQUIRED
      application/<feature>.ts       orchestration.         e2e only
      diplomat/in/<name>.ts          driving side.          e2e only
      diplomat/out/<name>.ts         driven side.           e2e only

This is standard hexagonal architecture under project-specific names. An LLM
should map its existing knowledge onto this table and then use OUR names:

    Domain model (entities, value objects)     ->  model/
    Domain services / business rules           ->  logic/
    Application layer / use cases              ->  application/
    Ports (boundary data contracts)            ->  wire/in, wire/out
    Mappers / translators                      ->  adapter/in, adapter/out
    Driving adapters (primary)                 ->  diplomat/in
    Driven adapters (secondary)                ->  diplomat/out

Only two things are non-standard, both deliberate: `wire` separates boundary
SCHEMAS from boundary CODE, and `diplomat` names both adapter directions.

## Layers

### `model/` — internal representation

Plain TypeScript `type` declarations. ZERO imports: no npm packages (Zod
included), no framework, no other layer of this app. This is the vocabulary
every other layer speaks.

Data reaching `model` has already been validated at `wire/in`, so it carries no
runtime checks. Business invariants are NOT expressed here; they are pure
functions in `logic/`.

### `logic/` — pure functions

Pure functions only: same input, same output, no I/O, no clock, no randomness,
no state. Operates on `model` types exclusively.

Because it is pure it is exhaustively unit-testable. `logic/<feature>.spec.ts`
is REQUIRED and MUST NOT contain mocks. If a function here needs a mock, it is
not pure and belongs in `application/` or `diplomat/`.

### `wire/` — external representation

Zod schemas describing data as it exists OUTSIDE the app. Declarations only —
no functions, therefore no tests.

- `wire/in/` — anything ENTERING: HTTP request bodies, responses from HTTP
  clients we call.
- `wire/out/` — anything LEAVING: HTTP responses we send, request bodies we
  send to HTTP clients.
- `wire/db/` — the database's external shape: `schema.prisma` and its
  migrations. It is not split in/out because one schema describes both
  directions. See the Prisma section.

`wire/in` schemas are the app's only trust boundary: unknown data is `parse`d
here and nowhere else. `wire/out` schemas act as a whitelist — serializing
through them prevents leaking undeclared fields.

`wire` MUST NOT import `model`. The two are independent vocabularies; `adapter`
is what relates them.

### `adapter/` — pure conversion

Pure functions converting between `wire` and `model`. May import `model`,
`wire` and Zod. MUST NOT import `application`, `diplomat`, or any framework.

`adapter/**/*.spec.ts` is REQUIRED and MUST NOT contain mocks.

Adapters are the trusted boundary: `model` has no runtime validation, so a
mis-mapped field is caught only by an adapter's unit test. Test every field.

### `application/` — orchestration (use cases)

One entry point per operation the application performs. Sequences the work:
calls `diplomat/out`, feeds results through `logic`, chains further calls.
Speaks `model` only — it never sees a `wire` type.

Holds NO business rules. A decision belongs in `logic` as a pure function; the
application layer only decides what to call and in what order. There is no
layer beneath it.

Not pure, so not unit-tested. Covered indirectly by e2e.

### `diplomat/` — the outside world

The only layer permitted to perform I/O.

- `diplomat/in/` — receives external interaction. The HTTP server and all its
  endpoints. Per request: `wire/in` -> `adapter` -> `model` -> `application` ->
  `model` -> `adapter` -> `wire/out` -> response.
- `diplomat/out/` — performs external interaction: database queries, outbound
  HTTP clients. Every exported function MUST take `model` types and return
  `model` types; conversion to and from `wire` happens inside.

No unit tests. Covered indirectly by e2e.

## Wiring

`diplomat/in/app.module.ts` is the ONLY file permitted to reach across every
layer, because constructing the graph is its entire job. It is the single
sanctioned reader of `process.env`.

The environment is external data entering the app, so it follows the same path
as any other input: `wire/in/environment.ts` declares its Zod schema,
`adapter/in/environment.ts` converts it to the `Configuration` type in `model`
and is unit-tested like every adapter, and wiring throws with every problem
listed if it does not parse — so a misconfigured app fails before it listens.

## Allowed imports

A layer MUST NOT import anything not listed. `-` means no import is permitted.

    from \ may import   model  logic  wire  adapter  application  diplomat/out  zod
    model                 -      -      -      -          -            -         -
    logic                YES     -      -      -          -            -         -
    wire                  -      -      -      -          -            -        YES
    adapter              YES     -    YES      -          -            -        YES
    application          YES   YES      -      -          -           YES        -
    diplomat/in          YES     -    YES    YES         YES           -        YES
    diplomat/out         YES     -    YES    YES          -            -        YES

A layer may always import ITSELF; the matrix governs crossing layers.

Consequences worth stating explicitly:

- `diplomat/out` MUST NOT import `application` (the driven side never drives).
- `application` MUST NOT import `wire` or `adapter` (it speaks `model` only).
- `logic` MUST NOT import anything but `model` — that is what keeps it pure.
- `diplomat/in` MUST NOT import `logic`. When a handler or guard needs a pure
  decision, `application` exposes an entry point that makes it. This is why
  `AuthApplication.resolveFrom(credentials, now)` exists rather than the guard
  calling `readAccessToken` itself.
- Nothing imports `diplomat/in`; it is the entry point.

The matrix is enforced by `eslint-plugin-boundaries`, and
`apps/api/scripts/check-boundaries.mjs` proves the enforcement still works by
asserting that deliberate violations FAIL. That script exists because the rules
once passed lint while matching nothing at all — a green lint is not evidence
on its own.

## NestJS containment

NestJS hosts the HTTP server and constructs the object graph. `application` and
`diplomat` are `@Injectable()` classes; `model`, `logic`, `wire` and `adapter`
are pure functions with no framework at all.

Dependency injection is for CONSTRUCTION and LIFECYCLE only — a database pool
that connects on boot and disconnects on `SIGTERM`, a client built from
configuration at wiring time rather than at import time. It is NEVER a
substitution mechanism: nothing is swapped, in tests or anywhere else.

- `@nestjs/*` MUST NOT be imported into `model`, `logic`, `wire` or `adapter`.
  Enforced by lint.
- NO file in this repo is named `*.controller.ts` or `*.service.ts`. Nest HTTP
  classes live at `diplomat/in/<name>.http.ts` and are named `<Name>Http`.
  Nest's `@Controller` and `@Injectable()` service conventions describe a
  layering this project does not use — do not reproduce them.
- Nest HTTP classes contain NO logic: parse, adapt, call `application`, adapt,
  return. Any branch that is not error mapping belongs in another layer.
- Auth and role checks belong in Nest guards. A guard MUST delegate the actual
  decision to a pure `logic` function, so the rule itself stays unit-tested.
- OpenAPI is generated from the Zod schemas in `wire/`, not from
  `@nestjs/swagger` (which reads `class-validator` decorators we do not use).
  A new endpoint MUST be added to the `OPERATIONS` table in
  `wire/out/openapi.ts` — method, path, summary, whether it is secured, its
  request schema and its success responses. The shared failure responses are
  added for you. An e2e test introspects the routes the running application
  registered and fails when any is undocumented.

## Database: Prisma

Prisma is the database client, used only inside `diplomat/out`. It is chosen
for its migration tooling, at a known cost to the `wire/in` rule.

**Explicit exception.** `wire/in` says data entering the app is parsed with
Zod. Database rows are the ONE exception: Prisma returns already-typed objects
from generated code, so re-parsing them with Zod would re-validate what Prisma
already guarantees. Therefore:

- Database rows are NOT parsed with Zod, and get no `wire/in` schema file.
- Prisma's generated types ARE the database's wire representation.
- Everything else entering the app (HTTP request bodies, HTTP client
  responses) is still parsed at `wire/in`. No other exception exists.

**Prisma types MUST NOT escape `diplomat/out` and `adapter`.** A Prisma type
never appears in `application/`, `logic/`, or `model/`. Import them with
`import type` only.

**`schema.prisma` describes storage, not the domain.** `model/` remains the
single definition of what a domain concept is. The two are allowed to differ —
a persistence shape may denormalise, add indexes, or store fields the domain
does not expose. `adapter/in/<name>.db.ts` converts Prisma rows to `model`;
`adapter/out/<name>.db.ts` converts `model` to Prisma inputs. Both carry
mandatory unit tests, as all adapters do.

**`schema.prisma` lives in `wire/`,** at `src/wire/db/schema.prisma` — it is
the database's external representation, which is exactly what `wire` means. It
does NOT live in a top-level `prisma/` directory, and the Prisma default layout
should not be restored. The path is configured in `apps/api/prisma.config.ts`.

Migrations live beside it at `src/wire/db/migrations/` and are generated with
`prisma migrate dev`. Every schema change ships as a migration; never edit a
migration that has already been applied outside local development.

## Worked example

`Space` is the reference feature and the template to copy. Its files, in the
order they were written:

    model/space.ts              Space, SpaceDraft, SpacePatch, SpaceRejection,
                                SpaceView, SpaceFailure
    logic/space.ts   + .spec    validateDraft, applyPatch — pure rules
    logic/membership.ts + .spec authorize(membership, action) — the decision a
                                guard delegates to
    wire/in/space-request.ts    CreateSpaceRequest, UpdateSpaceRequest
    wire/out/space-response.ts  SpaceResponse, SpaceListResponse
    adapter/in/space-request.ts + .spec   wire -> model
    adapter/in/space-row.ts     + .spec   Prisma row -> model
    adapter/out/space-response.ts + .spec model -> wire
    application/space.ts        SpaceApplication, @Injectable, model only
    diplomat/out/space.db.ts    SpaceDb, @Injectable, model in / model out
    diplomat/in/space.http.ts   SpaceHttp, parse -> adapt -> call -> adapt
    diplomat/in/app.module.ts   registration
    wire/out/openapi.ts         its entries in OPERATIONS
    test/e2e/space.e2e-spec.ts  every endpoint, success and each error path

`Result` is `{ ok: true; value: T } | { ok: false; error: E }` in
`model/result.ts`, with `ok()` and `err()` helpers in `logic/result.ts`.

A guard needing a pure decision calls the application layer, never `logic`
directly — `AuthApplication.resolveFrom(credentials, now)` reads the token from
either envelope via `logic/credentials.ts` and returns the caller. Copy that
shape rather than importing `logic` into `diplomat/in`.

## Adding a feature

Create files in this order. Do not skip the tests.

1. `model/<feature>.ts` — the internal types.
2. `logic/<feature>.ts` + `.spec.ts` — the rules, as pure functions.
3. `wire/in/<input>.ts`, `wire/out/<output>.ts` — external shapes.
4. `adapter/in/<name>.ts` + `.spec.ts`, `adapter/out/<name>.ts` + `.spec.ts`.
5. `application/<feature>.ts` — orchestration.
6. `diplomat/out/<name>.ts` — persistence / outbound calls.
7. `diplomat/in/<name>.http.ts` — the endpoints.
8. An e2e test covering the endpoint end to end.

Code carries NO comments. Names and types say what it does; `docs/` says why.

## What enforces what

Rules are machine-checked wherever they can be. `pnpm lint` runs all of it.

| Rule                                             | Enforced by                             |
| ------------------------------------------------ | --------------------------------------- |
| Import matrix between layers                     | `eslint-plugin-boundaries`              |
| Framework confined to impure layers              | `boundaries/external`                   |
| Prisma confined to `diplomat/out` + `adapter`    | `boundaries/external`                   |
| `process.env` read only when wiring              | `no-restricted-properties`              |
| No `any`, `@ts-ignore`, non-null assertion       | `typescript-eslint` strictTypeChecked   |
| Type strictness                                  | `tsconfig.base.json`                    |
| The rules above actually fire                    | `apps/api/scripts/check-boundaries.mjs` |
| No comments in code                              | `scripts/check-rules.mjs`               |
| Types declared only in `model`/`wire`            | `scripts/check-rules.mjs`               |
| No mocking anywhere                              | `scripts/check-rules.mjs`               |
| Forbidden filenames                              | `scripts/check-rules.mjs`               |
| A `.spec.ts` beside every `logic`/`adapter` file | `scripts/check-rules.mjs`               |
| Every route documented in OpenAPI                | e2e test                                |

**NOT mechanically enforceable — these rest on judgement:**

- That `logic` functions are genuinely pure. Lint stops them importing anything
  impure, which makes impurity hard, not impossible.
- That a `.spec.ts` is _meaningful_. Its existence is checked; its worth is not.
- That `application` holds no business rules. A rule hidden in an orchestration
  step will pass every check.
- That `diplomat/in` handlers hold no logic.
- That names are accurate — the strongest guarantee in a repo with no comments.

## Testing

Two tiers. Nothing in between. MOCKS ARE PROHIBITED IN BOTH — no `jest.mock`,
no stub objects, no fake implementations in process, no exceptions.

**Unit** — `logic/` and `adapter/` only. Both are pure, so no mock is ever
needed; needing one means the code is in the wrong layer.

**E2E** — everything else. Boots the real application and calls its real HTTP
endpoints. Every external dependency runs in a real Docker container via
Testcontainers:

- Database: the real `postgres` image.
- Object storage: the real `minio` image (S3 API).
- Any third party that publishes a runnable image: that image.
- Any third party that does not: a WireMock container. This is a real process
  answering real HTTP over a real socket — the app's own client, serialization
  and error handling all execute. It is not an in-process mock, and it is the
  only way to exercise 500s and timeouts on demand.

All orchestration and I/O correctness rides on e2e. That is the deliberate
price of banning mocks.

## HTTP conventions

- A resource owned by a space is addressed under it:
  `/spaces/{spaceId}/{resource}`. The space id is always a path segment, never
  a header or a query parameter, so authorization has one place to look.
- `/auth/*` is the only unscoped namespace besides `/health` and
  `/openapi.json`.
- Every scoped query filters by space. A caller who is not a member gets **403,
  never 404**, and a space that does not exist gets 403 as well — the two are
  deliberately indistinguishable, so a stranger cannot learn which spaces exist
  by probing ids. Adjust this only if your product wants existence to be public.

### The error contract

One shape for every failure, declared in `wire/out/error-response.ts`:

    { "error": { "code": "space.name-empty", "message": "Name is required." } }

`adapter/out/error-response.ts` maps a domain rejection to its status. Codes are
`{domain}.{rejection-kind}`, and the mapping in use is:

    400  request.invalid            body failed to parse at wire/in
    401  identity.*                 the provider's token was not accepted
    401  session.*                  unknown, revoked or expired session
    403  access.not-a-member        also returned for a space that is absent
    403  access.role-insufficient   a guest attempting a host action
    404  not-found                  a resource that is not space-scoped
    422  {feature}.{kind}           a business rule refused the request

A new rejection kind is added to the union in `model/`, given a message and a
status in `adapter/out/error-response.ts`, and covered by that adapter's spec.
Internal errors never carry a stack trace, SQL or a provider message.

## Frontend

`apps/web` uses the SAME layers and the SAME import matrix. The layers describe
a dependency direction, not a runtime.

    apps/web/src/
      model/<feature>.ts        domain types, zero imports    no tests
      logic/<feature>.ts        pure functions                unit tests REQUIRED
      wire/in/<name>.ts         zod schemas of API responses  no tests
      wire/out/<name>.ts        zod schemas of API requests   no tests
      adapter/in|out/<name>.ts  wire <-> model                unit tests REQUIRED
      application/<feature>.ts  queries, mutations, hooks     e2e only
      diplomat/out/<name>.ts    HTTP client calling our API   e2e only
      diplomat/in/<name>.tsx    React components and routes   e2e only

**Components are `diplomat/in`.** They are the driving adapter: they receive
external interaction from a human rather than from an HTTP request, and call
into `application`. The usual rule follows — a component holds no logic and no
branching beyond rendering. Anything decidable moves to `logic` and is
unit-tested.

**Conventional React folder names are NOT used.** No `components/`, `hooks/`,
`services/`, `utils/`, `pages/`, `types/`. Every React example you have seen
uses those names; this project does not. The mapping:

    types/                 ->  model/
    lib/, utils/           ->  logic/
    hooks/                 ->  application/
    api/, services/        ->  diplomat/out
    components/, routes/   ->  diplomat/in
    (no equivalent)        ->  wire/, adapter/

The last row is the point: conventional React has no parse boundary, so API
responses get cast rather than validated. Here they are parsed at `wire/in`.

**Duplication with the api is deliberate.** The web app's `wire/in` and the
api's `wire/out` describe the same JSON independently. They are not shared;
each app owns its own boundary. `packages/shared` was deleted for this reason.
