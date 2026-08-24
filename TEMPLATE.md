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
- **The `Space` feature** is an example that exercises every layer.
  `docs/ARCHITECTURE.md` § Worked example lists its files. Replace it with your
  own domain once the shape is clear; delete its tests with it.
- **`docs/DEPLOY.md`** deliberately names no host. Pick one, then record it.
- **The identity provider** in `docker/oidc` is a stub for local development
  only. Point `OIDC_*` at a real provider for anything else. The token it hands
  out is public and its signing key was discarded.

## What is enforced

`pnpm lint` fails on: a layer importing something the matrix forbids, a
framework import in a pure layer, `any` or a silenced compiler error, a comment
in code, a type declared outside `model`/`wire`, a mocking call, a forbidden
filename, or a pure file with no test beside it.

`docs/ARCHITECTURE.md` § What enforces what lists what is NOT enforceable, and
therefore rests on your judgement.
