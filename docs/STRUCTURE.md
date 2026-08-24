# Repository structure

    appname/
      CLAUDE.md              agent entrypoint
      PRODUCT.md             product intent and settled product decisions
      docs/                  technical rules (this directory)
      tsconfig.base.json     the strictness baseline; every workspace extends it
      package.json           workspace scripts
      pnpm-workspace.yaml
      docker-compose.yml     local stack: postgres, oidc, migrate, api, web
      .env.example           compose configuration; copied to .env by `make`
      docker/                nginx config and the local provider's stubs
      Makefile
      .github/workflows/     CI
      scripts/               repo-wide rule checks, run by `pnpm lint`
      apps/api/              NestJS backend
      apps/web/              Vite + React PWA

`packages/` is removed. `packages/shared` had no job — see `docs/DECISIONS.md`.

## Inside an app

Both apps use the same layers. Full rules in `docs/ARCHITECTURE.md`.

    src/
      model/          internal types, zero imports
      logic/          pure functions            + .spec.ts REQUIRED
      wire/in/        zod schemas, data entering
      wire/out/       zod schemas, data leaving
      wire/db/        schema.prisma + migrations        (api only)
      adapter/in/     wire -> model             + .spec.ts REQUIRED
      adapter/out/    model -> wire             + .spec.ts REQUIRED
      application/    orchestration / use cases
      diplomat/in/    HTTP server (api) | React components and routes (web)
      diplomat/out/   database and HTTP clients (api) | API client (web)

    test/e2e/         e2e specs, testcontainers (api) | playwright specs (web)

## Naming

| Thing           | Convention                                       | Example                       |
| --------------- | ------------------------------------------------ | ----------------------------- |
| Layer file      | `<feature>.ts`, kebab-case                       | `model/space.ts`              |
| Unit test       | `<name>.spec.ts`, beside its subject             | `logic/space.spec.ts`         |
| E2E test        | `<feature>.e2e-spec.ts` in `test/e2e/`           | `test/e2e/space.e2e-spec.ts`  |
| Nest HTTP class | `diplomat/in/<name>.http.ts`, class `<Name>Http` | `SpaceHttp`                   |
| React component | `diplomat/in/<name>.tsx`, PascalCase export      | `SpaceForm`                   |
| Zod schema      | PascalCase, type inferred with the same name     | `const Space = z.object(...)` |

**Forbidden filenames anywhere in the repo:** `*.controller.ts`,
`*.service.ts`, `*.repository.ts`, `*.dto.ts`, `*.entity.ts`. They belong to a
layering this project does not use, and an LLM producing them has drifted.

## Commands

    pnpm install
    pnpm dev            api :3000, web :5173 (web proxies /api)

    make run            build, start in the background, wait until healthy,
                        then print the urls
    make ps             service status
    make logs           follow logs             (ARGS=api to pick one)
    make smoke          exercise the running stack over real HTTP
    make down           stop it
    make clean          stop it and drop the database volume

`make run` never blocks a terminal: it returns once every healthcheck passes and
prints where the app is. If a service never becomes healthy it fails there rather
than leaving you to discover it later.

Every service image is built from a Dockerfile. Nothing installs dependencies
or compiles inside a compose command, so what runs locally is what CI builds.
`make` creates `.env` from `.env.example` on first run; compose reads it and no
value is written inline in `docker-compose.yml`.

Every healthcheck uses `interval: 1s` and `timeout: 1s`. Nothing local should
take longer than a second to answer, so a slow probe is a fault, not something
to wait out. Where a service legitimately needs time to come up, that is
expressed as MORE RETRIES, never a longer interval or timeout: `api` gets 30,
everything else 15.

Ordering is expressed through healthchecks: `api` waits for `postgres` and
`oidc` to be healthy AND for `migrate` to complete; `web` waits for `api`. A
cold start from an empty volume takes about 18s.

    pnpm typecheck      tsc across all workspaces
    pnpm lint           eslint, the import-matrix proof, and the project rules
    pnpm test           unit tests
    pnpm test:e2e       api e2e tests (requires Docker)
    pnpm test:e2e:web   browser e2e against the real stack (requires Docker)
    pnpm format         prettier
    make test           everything CI runs

This list is canonical; `CLAUDE.md` points here rather than repeating it.

Narrowing the loop while working:

    pnpm --filter @appname/api test logic/space          one unit file
    pnpm --filter @appname/api test:e2e test/e2e/auth.e2e-spec.ts
    pnpm --filter @appname/web exec playwright test --grep "creates a space"

## The local stack

| Service    | Image                            | Port | Role                                                 |
| ---------- | -------------------------------- | ---- | ---------------------------------------------------- |
| `postgres` | `postgres:17`                    | 5432 | the database                                         |
| `oidc`     | `wiremock/wiremock`              | 8081 | a local OpenID provider, so sign-in works offline    |
| `migrate`  | built from `apps/api/Dockerfile` | —    | applies migrations once, then exits                  |
| `api`      | built from `apps/api/Dockerfile` | 3000 | the server                                           |
| `web`      | built from `apps/web/Dockerfile` | 5173 | nginx serving the production bundle, proxying `/api` |

The web container serves the same static bundle CI publishes and proxies `/api`
to the api, so the browser sees one origin and cookies behave as in production.

`oidc` serves a fixed JWKS and an `/authorize` endpoint that redirects back with
a long-lived signed token, from `docker/oidc/mappings`. It exists so the whole
flow works with no external request. It is for local development only — the
signing key was thrown away, and the token it hands out is public.

## Database workflow

The schema is not in Prisma's default location, so always go through the
package scripts, which read `apps/api/prisma.config.ts`:

    pnpm --filter @appname/api prisma:generate     after changing the schema
    pnpm --filter @appname/api prisma:migrate      create + apply a migration
    pnpm --filter @appname/api prisma:deploy       apply existing migrations

`prisma.config.ts` reads `DATABASE_URL`, so it must be set even to generate.
E2E applies migrations itself against its own container — there is nothing to
run by hand before `pnpm test:e2e`.

## What enforces the rules

    apps/api/scripts/check-boundaries.mjs   writes deliberate violations of the
                                            import matrix and fails if lint does
                                            NOT reject them. Nothing to update
                                            when adding a feature.
    scripts/check-rules.mjs                 no comments, no mocks, types only in
                                            model/ and wire/, no forbidden
                                            filenames, and a .spec.ts beside
                                            every logic/ and adapter/ file.

Both run as part of `pnpm lint`.

## Environment

Every variable is declared in one Zod schema per app and parsed at boot. The
app refuses to start if a variable is missing or malformed — it never starts
half-configured.

`process.env` is read in exactly one file per app. Everywhere else imports the
typed config object. Reading `process.env` elsewhere is a lint error.

`.env.example` lists every variable with a safe local default and is kept in
sync with the schema. Secrets are never committed.

## Requirements

Node >= 22.12, pnpm 10 (`corepack enable`), Docker for the local database and
for e2e tests.
