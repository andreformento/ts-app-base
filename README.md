# ts-hexagonal-base

A TypeScript monorepo template: a NestJS api and a React PWA, tested against
real containers with no mocks anywhere.

Use it with **Use this template**, then run one command to name your project.

## What you get

- **Conventional NestJS.** Resource modules, DI, `class-validator` DTOs behind a
  global `ValidationPipe`, Nest's own exceptions, `@nestjs/config`,
  `@nestjs/swagger`, `@nestjs/passport`. No custom architecture to learn.
- **One convention of our own**: business rules the framework cannot express are
  pure functions in `<feature>.rules.ts`, unit-tested exhaustively. Services do
  I/O and are covered by e2e. That is what makes the no-mock rule affordable.
- **The compiler guards the wire.** Mappers build response entities as object
  literals, so returning an undeclared field is a build error rather than a leak.
- **OpenID login** issuing your own rotating tokens, accepted from a bearer
  header or a cookie behind one code path, with immediate revocation.
- **Role authorization as a guard**, declared per route.
- **No mocks, in any tier.** Postgres and the identity provider are real
  containers; no test makes an external request.
- **A local stack** built from Dockerfiles, healthy in about twenty seconds.
- **CI** gating types, lint, unit, api e2e, browser e2e, the running stack and
  the release artifacts.

## Start

```sh
scripts/init.sh my-project     # names everything, then removes itself
pnpm install
make up                        # prints the urls when everything is healthy
```

Then open the web url and sign in — the stack includes a local identity
provider, so nothing external is contacted.

## Then

1. Write `PRODUCT.md`. It is what an agent reads to know what to build.
2. Read `CLAUDE.md` and `docs/DECISIONS.md` before writing code.
3. Keep or replace the `spaces` and `invites` examples. They exist to show the
   conventions end to end.

## Verifying

```sh
make test          # everything CI runs
make smoke         # exercise the running stack over real HTTP
```

## Licence

MIT.
