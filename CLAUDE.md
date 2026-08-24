# appname — agent entrypoint

Read this first. It is the index; the rules live in `docs/`.

The technical base is implemented: layers, strict TypeScript, lint-enforced
import boundaries, OpenID login, a worked CRUD feature, and both test tiers
against real containers. Follow the docs; the code already does.

`Space` is an EXAMPLE feature, present to show every layer working end to end.
Replace it with the product's own domain when the shape is clear.

## What this is

`PRODUCT.md` — what the product is and which product decisions are settled.
Read it before designing a feature; do not relitigate what it records. If it is
still the stub, ask what to build rather than inventing it.

This file and `docs/` — how the code is built. Product intent comes from
`PRODUCT.md`; everything technical comes from here.

## Documents

| File                   | Contents                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md` | The layers, the import matrix, framework containment. **Read before writing any code.** |
| `docs/STRUCTURE.md`    | Repo layout, file and symbol naming, commands                                           |
| `docs/TESTING.md`      | The two test tiers and the mock ban                                                     |
| `docs/STACK.md`        | Every dependency and why it is there                                                    |
| `docs/DEPLOY.md`       | Build outputs. Target host is an open decision                                          |
| `docs/DECISIONS.md`    | Settled decisions with rejected alternatives. Do not relitigate                         |

## Non-negotiables

1. **Layers.** `model` / `logic` / `wire` / `adapter` / `application` /
   `diplomat` in both apps. The import matrix in `docs/ARCHITECTURE.md` is
   lint-enforced. Never introduce a layer, and never bypass one.
2. **No mocks. Anywhere.** No `vi.mock`, no stub objects, no in-process fakes,
   in any tier. If code needs a mock it is in the wrong layer.
3. **Purity.** `logic` and `adapter` are pure and carry mandatory unit tests.
   Everything impure is covered only by e2e against the real running app with
   real Docker containers.
4. **One trust boundary.** Unknown data is parsed with Zod at `wire/in` and
   nowhere else. Database rows are the single documented exception.
5. **Maximum TypeScript strictness.** No `any`, no `@ts-ignore`, no non-null
   assertion, no unchecked cast. Fix the type, do not silence the compiler.
6. **The pure core is framework-free.** No `@nestjs/*` in `model`, `logic`,
   `wire` or `adapter`. No file is named `*.controller.ts` or `*.service.ts`.
7. **Every internal type lives in `model`**, every external schema in `wire`.
   No other layer declares a type of its own.
8. **No comments in code.** Names and types carry the meaning; `docs/` carries
   the rationale.

## Adding a feature

Get the product intent from `PRODUCT.md`, then follow the ordered file list in
`docs/ARCHITECTURE.md` § Adding a feature. It tells you every file to create,
in order, including the tests. Do not skip the tests.

## What is checked for you

`pnpm lint` enforces the import matrix, the framework boundaries, the type
discipline, the comment ban, the mock ban, where types may be declared, and
that every pure file has a test. It also asserts those checks still fire, since
they once passed while matching nothing.

What it CANNOT check — see `docs/ARCHITECTURE.md` § What enforces what — is
whether a `logic` function is truly pure, whether a test is meaningful, and
whether a business rule has been hidden in `application`. Those are on you.

## Commands

    pnpm dev            api :3000, web :5173
    make run            whole stack in docker compose
    make test           everything CI runs

`docs/STRUCTURE.md` § Commands is canonical and covers narrowing the loop to a
single test file, plus the database workflow.

CI gates on typecheck, lint, unit, api e2e and browser e2e. All must pass.
