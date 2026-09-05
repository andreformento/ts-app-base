# Structure

    appname/
      CLAUDE.md              agent entrypoint
      PRODUCT.md             what the product is
      docs/                  these documents
      tsconfig.base.json     strictness, extended by both apps
      docker-compose.yml     postgres, oidc, migrate, api, web
      .env.example           compose configuration, copied to .env by make
      docker/                nginx config, local provider stubs
      scripts/smoke-stack.sh exercises a running stack over real HTTP
      apps/api/              NestJS
      apps/web/              Vite + React

## apps/api

Conventional Nest. One directory per feature, each a module.

    src/
      main.ts                bootstrap and SIGTERM handling
      app.ts                 createApp(), used by main and by the e2e harness
      app.module.ts          root module
      config/environment.ts  env DTO, validated by ConfigModule at boot
      prisma/                PrismaModule and PrismaService (global)
      auth/                  controller, service, rules, jwt strategy, guard
      memberships/           the space role guard, its decorators and rules
      spaces/                controller, service, rules, dto, entities
      health/                readiness
    prisma/schema.prisma     database schema and migrations
    test/e2e/                harness plus one spec per feature

Two files per feature are pure and therefore unit-tested:

**`<feature>.rules.ts`** — business rules the framework cannot express. A
service imports them; a rule never imports a service.

**`<feature>.mapper.ts`** — turning a database row into the entity a client
receives. It builds the entity as an object literal, so an undeclared column is
a compile error rather than a leak. Never spread a row into it: `{ ...row }`
compiles and leaks. It needs no test unless it makes a decision.

## apps/web

Conventional React.

    src/
      main.tsx               entry, providers
      routes/                one component per screen
      features/<name>/       components and hooks for that feature
      components/ui/         shared presentational components
      lib/                   api client, pure helpers, their tests
      types/                 shared types
    test/e2e/                Playwright specs and the stack they run against

## Commands

    pnpm install
    pnpm dev            api :3000, web :5173

    make up             build and start the stack, wait until healthy, print urls
    make ps             service status
    make logs           follow logs           (ARGS=api for one service)
    make smoke          exercise the running stack over real HTTP
    make down           stop it
    make clean          stop it and drop the database volume

    pnpm typecheck
    pnpm lint
    pnpm test           unit
    pnpm test:e2e       api against real containers
    pnpm test:e2e:web   browser against the real stack
    make test           all of the above, as CI runs it

Narrowing the loop:

    pnpm --filter @appname/api test spaces
    pnpm --filter @appname/api test:e2e test/e2e/auth.e2e-spec.ts
    pnpm --filter @appname/web exec playwright test --grep "creates a space"

## Database

    pnpm --filter @appname/api prisma:migrate     create and apply a migration
    pnpm --filter @appname/api prisma:deploy      apply existing migrations

Generating the client is a `postinstall`, so a fresh clone can typecheck after
`pnpm install` with nothing configured. E2E applies migrations to its own
container; there is nothing to run by hand before `pnpm test:e2e`.

## The local stack

| Service    | Image                            | Port | Role                                                 |
| ---------- | -------------------------------- | ---- | ---------------------------------------------------- |
| `postgres` | `postgres:17`                    | 5432 | the database                                         |
| `oidc`     | `wiremock/wiremock`              | 8081 | a local OpenID provider so sign-in works offline     |
| `migrate`  | built from `apps/api/Dockerfile` | —    | applies migrations once, then exits                  |
| `api`      | built from `apps/api/Dockerfile` | 3000 | the server                                           |
| `web`      | built from `apps/web/Dockerfile` | 5173 | nginx serving the production bundle, proxying `/api` |

Every service is built from a Dockerfile; nothing installs or compiles inside a
compose command. Every healthcheck uses `interval: 1s` and `timeout: 1s` —
nothing local should need longer to answer, and a service that needs time to
start gets more RETRIES instead. A cold start takes about 20s.

The `oidc` container is for local development only. Its signing key was
discarded and the token it hands out is public.
