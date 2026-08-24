# Tech decisions

Running log. Each entry is settled unless marked OPEN. Do not relitigate a
settled entry; if it must change, add a new entry that supersedes it.

## Settled

### Contract style: REST + Zod

Zod schemas are the single source of truth for the HTTP contract. The API
validates requests against them; TypeScript types are derived via `z.infer`,
never hand-written alongside. GraphQL and tRPC were considered and rejected.

### TypeScript: maximum strictness

One `tsconfig.base.json` at the repo root; every workspace extends it and
overrides only module/target/lib concerns. Flags:

    strict, noUncheckedIndexedAccess, noImplicitOverride, noImplicitReturns,
    noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch,
    verbatimModuleSyntax, isolatedModules, forceConsistentCasingInFileNames,
    exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature

The current scaffold explicitly DISABLES strictness (`noImplicitAny: false`,
`strictBindCallApply: false` in apps/api; no `strict` at all in apps/web).
Those opt-outs are removed.

`skipLibCheck` stays TRUE. Turning it off was considered and dropped: it
typechecks all of node_modules and surfaces third-party `.d.ts` conflicts we
did not cause and cannot fix. Strictness applies to our code.

### Lint: type-checked, escapes banned

`typescript-eslint` `strictTypeChecked` as errors. `no-explicit-any`,
`no-floating-promises`, `no-non-null-assertion` are errors. `@ts-ignore` is
banned; `@ts-expect-error` requires a description. Escaping a rule requires an
explicit `eslint-disable` line with a written reason.

### Backend structure: model / logic / wire / adapter / application / diplomat

Defined by the repo owner. Full rules in `docs/ARCHITECTURE.md`. Layer-first,
feature-as-filename, dependencies pointing inward to `model`.

`model` holds plain TypeScript types with zero imports; Zod lives in `wire`
only. Data is validated exactly once, at `wire/in`. Business invariants are
pure functions in `logic`, not runtime checks in `model`. Adapters are the
trusted boundary and carry mandatory unit tests.

`diplomat` splits into `in/` (driving: HTTP server) and `out/` (driven:
database, HTTP clients), mirroring `wire/in` and `wire/out`, so the import
boundary is lint-enforceable.

### HTTP framework: NestJS, contained

NestJS is kept — already scaffolded, guards give a clean home for the
per-request role check, and it is the framework LLMs know best. Fastify and
Hono were considered; the tradeoff is that Nest's DI container is inert here
(nothing is ever substituted, because mocks are banned).

Nest is confined to `diplomat/in`. Its own conventions (`@Controller` classes,
`*.service.ts` business logic) describe a layering this project rejects, so
containment rules are mandatory and lint-enforced. See `docs/ARCHITECTURE.md`.

### Orchestration layer is named `application/`

The canonical hexagonal name. Earlier candidates: `controller` (rejected — the
name collides with Nest's `@Controller`, which would invite an LLM to merge
orchestration into the HTTP handler), `service` (rejected — collides with
Nest's `*.service.ts` business-logic convention), `facade` (rejected — its
"thin wrapper" connotation invites inventing a layer beneath it), `use-case`.

### Database: Prisma, with a bounded exception to the wire rule

Prisma is kept, chosen for migration tooling. Kysely, Drizzle and raw `pg` were
considered: they fit the architecture more literally, because DB rows would be
genuinely unknown until parsed at `wire/in`.

Consequence accepted: database rows are NOT Zod-parsed. Prisma's generated
types are the database's wire representation. This is the only exception to the
`wire/in` trust-boundary rule; HTTP bodies and HTTP client responses are still
parsed. Prisma types are confined to `diplomat/out` and `adapter`, and
`schema.prisma` describes storage while `model/` remains the domain truth.

`schema.prisma` lives at `apps/api/src/wire/db/schema.prisma`, with migrations
beside it — it is the database's external representation, which is what `wire`
means. The Prisma default top-level `prisma/` layout is not used. `wire/db` is
not split in/out because one schema describes both directions.

### Nest DI in `application` and `diplomat`

`application` and `diplomat` are `@Injectable()` classes; `model`, `logic`,
`wire` and `adapter` stay pure functions with no framework. DI earns its place
for construction and lifecycle: the database pool connects on boot and
disconnects on SIGTERM, and clients are built from configuration at wiring time
rather than at import time — which module-level singletons made impossible to
point at a container in tests. DI is never a substitution mechanism.

### Every internal type lives in `model`

No layer declares its own `type` or `interface`. Result shapes used by
`application` (`SpaceView`, `SpaceFailure`, `Tokens`, `Failure`) live in
`model`; schemas live in `model` or `wire` and nowhere else.

### Code carries no comments

Names, types and file placement carry the meaning; `docs/` carries the
rationale. Only functional directives (`eslint-disable` with a reason) remain.

### Testing: two tiers, no mocks

Unit tests cover `logic` and `adapter` (both pure). Everything impure
(`application`, `diplomat`) is covered only by e2e against the real running app.
Mocks are prohibited in every tier without exception.

E2E external dependencies run as real Docker containers via Testcontainers:
the real image where one exists (`postgres`, `minio` for S3), WireMock where
the third party publishes none.

### Frontend testing: real stack, no interception

The browser e2e suite runs the PRODUCTION web bundle against a real api and a
real database in containers — the same Testcontainers setup the api e2e uses.
Playwright drives it.

Route interception (`page.route`, fixture responses, service-worker fakes) is
mocking and is banned like every other kind. Test data is created through the
real API, never by writing to the database.

There are no component tests: components are `diplomat/in` and hold no logic,
and a component test would immediately require mocking the data layer.
Decidable behaviour lives in `logic` and is unit-tested there.

Google OAuth in e2e uses a containerized mock-oauth2 server image — a real
image, which the container rule already permits.

### The local stack builds from Dockerfiles

`docker-compose.yml` builds every service from a Dockerfile and runs no install
or build step of its own. The previous version ran generic `node` images that
installed dependencies and started dev servers inline, so the local stack and
the CI artifacts were different things. Now the web container serves the same
production bundle CI publishes, behind nginx proxying `/api`.

Configuration comes from `.env` (created from `.env.example`), never inline.

Every healthcheck uses `interval: 1s` and `timeout: 1s`, in compose and in the
Dockerfiles alike. A local service that cannot answer within a second is
faulty, and a longer timeout would only hide that. Services that need time to
start get more RETRIES instead — `api` 30, the rest 15 — so the ceiling moves
without ever slowing a probe. Ordering is expressed through
`condition: service_healthy` and `service_completed_successfully`, never sleeps,
and migrations run as a one-shot service before the api starts.

A WireMock container serves a local OpenID provider so sign-in works with no
external request. Local development only: its signing key was discarded and the
token it issues is public.

### `prisma` is a runtime dependency

The api image carries the Prisma CLI so migrations are applied from the same
artifact that runs the server, which stops the schema and the server drifting
apart. It is most of the image's size; a separate, smaller migration image was
the alternative and was rejected for that reason.

### OpenAPI is generated from the wire schemas

`GET /openapi.json` is built from the Zod schemas that actually validate
requests, using Zod 4's native `z.toJSONSchema` — no generator dependency, and
no second description of the contract that could drift.

`wire/out/openapi.ts` declares the operation table; an e2e test introspects the
routes the running application registered and fails if any is undocumented. It
caught the spec endpoint failing to document itself on the first run.

### Prisma 7 requires a driver adapter

`datasources` and `datasourceUrl` were removed in Prisma 7. The client is
constructed with `@prisma/adapter-pg` and an explicit connection string, which
suits DI: the URL arrives from validated configuration.

### `packages/shared` does not exist

It has no job. Each app owns its own boundary schemas: the api's `wire/out` and
the web's `wire/in` describe the same JSON independently. That duplication is
deliberate — sharing them would couple the two apps' internals and reintroduce
build-order coupling between a Node process and a browser bundle.

### Auth: own tokens, dual transport, client-agnostic

Google proves identity only. The API issues its OWN short-lived access token
and a rotating refresh token. Passport is NOT used: it covers only the web
redirect leg and assumes session middleware, while the native leg would be
hand-rolled anyway. Code exchange and ID-token verification are done directly
with `jose` against Google's JWKS.

Per-client differences are confined to two places:

    handshake   web: redirect + callback   mobile: native PKCE (system browser)
    transport   web: httpOnly cookie       mobile: Authorization: Bearer
    session     IDENTICAL

The guard accepts either envelope and everything downstream is one code path.
Endpoints are the same for every client:

    POST /auth/google   { code | id_token } -> { accessToken, refreshToken, user }
                                               (+ Set-Cookie when the caller is web)
    POST /auth/refresh  -> new pair, old one revoked
    POST /auth/logout   -> refresh token revoked
    GET  /auth/me       -> current user + role in space

Refresh tokens are stored in the database so revocation is immediate, and the
role is re-checked from the database on every request, so no role is ever baked
into a token. Drop that re-check only if your product can tolerate a removed
member keeping access until their token expires.

Adding a mobile app later requires one additional Google client ID and no new
server logic.

Layer placement: endpoints and guard in `diplomat/in`; Google JWKS/token calls
and the refresh-token table in `diplomat/out`; claim validation (issuer,
audience allowlist, expiry with an injected `now`) and role decisions as pure
functions in `logic`; `User`, `Session`, `Membership` in `model`.

### Frontend: same layers as the backend

`apps/web` uses the same layer names and the same import matrix. React
conventional folders (`components/`, `hooks/`, `services/`, `utils/`,
`pages/`, `types/`) are not used. Rationale: conventional React has no parse
boundary — responses get cast rather than validated — and one vocabulary across
the repo means one set of rules. Cost accepted: every React example an LLM has
seen uses the other names, so the docs state the mapping explicitly.

### Defaults taken

Error handling: `logic` returns a `Result` union (keeps it pure and total);
typed errors are thrown only in `diplomat`, which maps them to HTTP status
codes.

Frontend: TanStack Query, TanStack Router, Tailwind + shadcn/ui, React Hook
Form with the Zod resolver.

Tooling: Vitest for both apps and both tiers (ts-jest fights
`verbatimModuleSyntax` and ESM under maximum strictness);
`eslint-plugin-boundaries` to enforce the import matrix; env parsed with Zod at
boot with the app refusing to start when misconfigured; plain pnpm scripts, no
Turborepo; GitHub Actions gating typecheck, lint, unit and e2e; Conventional
Commits with squash merge.

Reference feature: `Space` CRUD plus OpenID login and a two-role membership
check — enough to exercise every layer. It is an EXAMPLE, not a requirement:
keep it while learning the layers, then replace it with your own domain.

### Scope of these documents

`docs/` answers HOW to build: where files go, what may import what, how to test,
how to run. `PRODUCT.md` answers WHAT to build. Neither answers the product
questions a specific feature raises — data shape, ordering semantics, conflict
policy — and they are not meant to. A feature needs a product decision before it
needs a plan.

## Open

### Deploy target

Deliberately parked, and nothing in the code depends on a platform. NestJS
wants a persistent process, and cheap persistent hosting is the constraint to
weigh when you choose one.



