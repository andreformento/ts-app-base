# ts-hexagonal-base

A TypeScript monorepo template: hexagonal architecture with the boundaries
enforced by tooling rather than by convention, and two test tiers that run
against real containers instead of mocks.

Use it with **Use this template**, then run one command to name your project.

## What you get

- **Layers**: `model` / `logic` / `wire` / `adapter` / `application` /
  `diplomat`, identical in the api and the web app, with the import matrix
  enforced by lint — a violation fails the build.
- **NestJS + Prisma + Postgres** api, **React + Vite** PWA.
- **OpenID login** that issues its own tokens and accepts a bearer header or a
  cookie behind one code path, so a native client works later with no server
  change.
- **No mocks anywhere.** Pure layers are unit-tested; everything else runs
  against real Docker containers, including a local identity provider, so no
  test makes an external request.
- **OpenAPI** generated from the same Zod schemas that validate requests, with
  a test that fails when a route is undocumented.
- **A local stack** that builds from Dockerfiles and comes up healthy in ~20s.
- **CI** gating types, lint, unit, api e2e, browser e2e, the running stack, and
  the release artifacts.

## Start

```sh
scripts/init.sh my-project     # names everything, then removes itself
pnpm install
make run                       # prints the urls when everything is healthy
```

Then open the web url and sign in — the stack includes a local identity
provider, so nothing external is contacted.

## Then

1. Write `PRODUCT.md`. It is what an agent reads to know what to build.
2. Read `CLAUDE.md` and `docs/ARCHITECTURE.md` before writing code.
3. Keep or replace the `Space` example. It exists to show every layer working
   end to end; `docs/ARCHITECTURE.md` walks through its files.

## Verifying

```sh
make test          # everything CI runs
make smoke         # exercise the running stack over real HTTP
```

## Licence

MIT.
