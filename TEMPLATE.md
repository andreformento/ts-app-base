# Using this template

## 1. Name the project

```sh
scripts/init.sh my-project
```

`my-project` must be lowercase letters, digits and hyphens, starting with a
letter. It becomes the npm scope (`@my-project/api`), the compose project, the
database name, the cookie prefix and the token issuer.

The script rewrites every occurrence, writes a project README, and deletes
itself and this file. Review the diff before committing — it is a plain
search-and-replace and you are meant to read it.

## 2. Check it works before writing anything

```sh
pnpm install
make test
```

Everything should pass on a fresh clone. If it does not, fix that first —
you are about to build on it.

## 3. Make it yours

- **`PRODUCT.md`** is a stub. Write it. `CLAUDE.md` sends an agent there for
  intent, so an empty brief produces invented behaviour.
- **`spaces` and `invites`** are examples showing the conventions end to end:
  a rules file, DTOs, a mapper, a service, a controller, a role guard and e2e.
  Replace them with your own domain once the shape is clear; delete their tests
  with them.
- **`docs/DEPLOY.md`** deliberately names no host. Pick one, then record it.
- **The identity provider** in `docker/oidc` is a stub for local development
  only. Point `OIDC_*` at a real provider for anything else. The token it hands
  out is public and its signing key was discarded.

## What is enforced

`pnpm typecheck` fails when a mapper returns a field the entity does not
declare. `pnpm lint` fails on `any`, a silenced compiler error, a comment in
code, or a mocking call.

Everything else rests on judgement, and `CLAUDE.md` states it in seven rules.
The one worth repeating: put a business rule in `<feature>.rules.ts` where it is
pure and tested, not inside a service where only e2e can reach it.
