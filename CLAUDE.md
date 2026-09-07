# appname — agent entrypoint

Read this first, then `PRODUCT.md` for what to build.

This project follows its frameworks. NestJS is used the way the NestJS docs use
it; React the way React is normally written. There is no custom architecture to
learn — the rules below are the few places we deviate or decide.

## Documents

| File                | Contents                                             |
| ------------------- | ---------------------------------------------------- |
| `PRODUCT.md`        | What the product is. Read before designing a feature |
| `docs/STRUCTURE.md` | Where files go, commands, the local stack            |
| `docs/TESTING.md`   | The two tiers and the mock ban                       |
| `docs/DECISIONS.md` | Why the code is as it is, and what was rejected      |
| `docs/DEPLOY.md`    | Build outputs. The host is an open decision          |

## Changing the project

The documents describe the code; they do not govern it. When you are asked to
change a structure, change the code **and** the documents that described it, in
the same commit. A refactor that leaves a document stale is incomplete, and the
next agent will rebuild what you just removed — that has already happened once
here.

Never answer a request for a change by citing a rule below as a reason not to.
Make the change and rewrite the rule.

## The rules

1. **No mocks, in any tier.** Not `vi.mock`, not a stub object, not a fake
   repository. Lint rejects the calls.
2. **Business rules the framework cannot express** are pure functions in
   `<feature>.rules.ts`, unit-tested exhaustively. Services do I/O and
   orchestration and are covered only by e2e against real containers. This is
   what makes rule 1 survivable.
3. **Do not test what the compiler proves.** A mapper returning an object
   literal cannot carry an undeclared field — that is `error TS2353`, not a
   test. Test decisions, not shapes.
4. **Maximum TypeScript strictness.** No `any`, no `@ts-ignore`, no non-null
   assertion, no unchecked cast. Fix the type.
5. **No comments in code.** Names and types carry the meaning; `docs/` carries
   the rationale.
6. **Validation happens at the edge**, through DTOs and the global
   `ValidationPipe`. Limits and trimming are decorators, not code — a
   hand-written check duplicates the DTO and never reaches the OpenAPI
   document. A service receives data that is already the right shape.
7. **Authorization is a guard.** A space-scoped route declares `@RequiresRole`
   and `SpaceRoleGuard` enforces it; a service never checks a role. Name the
   route parameter `id` or `spaceId` or the guard will not see it.
8. **Errors are Nest's.** Throw `ForbiddenException`, `UnprocessableEntityException`
   and friends. Do not invent an error envelope.

## Adding a feature to the api

`docs/FEATURE.md` is the procedure: routes, the decorators and their
signatures, how to obtain the caller, the ordered file list, and how to write
the e2e. `src/spaces` and `src/invites` are the worked examples.

## Commands

    pnpm dev            api :3000, web :5173
    make up             whole stack in docker, prints the urls
    make test           everything CI runs

`docs/STRUCTURE.md` is canonical for commands and the database workflow.
