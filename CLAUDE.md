# appname — agent entrypoint

Read this first, then `PRODUCT.md` for what to build.

This project follows its frameworks. NestJS is used the way the NestJS docs use
it; React the way React is normally written. There is no custom architecture to
learn — the rules below are the few places we deviate or decide.

## Documents

| File                | Contents                                             |
| ------------------- | ---------------------------------------------------- |
| `PRODUCT.md`        | What the product is. Read before designing a feature. If it is still the stub, ask rather than invent |
| `docs/STRUCTURE.md` | Where files go, commands, the local stack            |
| `docs/TESTING.md`   | The two tiers and the mock ban                       |
| `docs/DECISIONS.md` | Settled decisions and rejected alternatives          |
| `docs/DEPLOY.md`    | Build outputs. The host is an open decision          |

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

```
nest g resource <name>          # or copy src/spaces
```

Then, in order:

1. `<name>.rules.ts` + `.spec.ts` — the rules, pure, tested first
2. `dto/` — what may enter, `class-validator` decorators, types only
3. `entities/` — what may leave. Plain classes, no decorators
4. `<name>.mapper.ts` — row to entity, built as an object literal so the
   compiler rejects any undeclared field. No test unless it makes a decision
5. `<name>.service.ts` — I/O and orchestration, calling the rules and the mapper
6. `<name>.controller.ts` — routes, thin
7. `test/e2e/<name>.e2e-spec.ts` — every endpoint, success and failure

## Commands

    pnpm dev            api :3000, web :5173
    make up             whole stack in docker, prints the urls
    make test           everything CI runs

`docs/STRUCTURE.md` is canonical for commands and the database workflow.
