# Testing

Two tiers. Nothing between them.

## The mock ban

**No mocks, in any tier.** No `vi.mock`, no stub objects, no fake repositories,
no `jest.fn`. Lint rejects those calls.

The ban is only affordable because of the rules convention: anything worth
testing in isolation is a pure function, and a pure function needs no mock. If
a test seems to need one, the logic is in the wrong place — move the decision
into `<feature>.rules.ts` and leave the I/O in the service.

## Tier 1 — unit

Covers `*.rules.ts` and the pure helpers in `apps/web/src/lib`. Pure means:
same input, same output, no I/O, no clock, no randomness. A function that needs
the time takes `now: Date` as a parameter.

    pnpm test

## Tier 2 — e2e

Covers everything else: controllers, services, guards, Prisma, the browser.

The containers start **once per run**, in `test/e2e/global-setup.ts`, and every
spec file shares them. Each file boots its own application with `createApp()` —
the same function `main.ts` uses — and calls it over real HTTP. Every external
dependency is a real container:

| Dependency                          | Container                                                    |
| ----------------------------------- | ------------------------------------------------------------ |
| Database                            | the real `postgres` image                                    |
| OpenID provider                     | a WireMock container serving a JWKS whose key the test holds |
| A third party with a runnable image | that image                                                   |
| A third party without one           | a WireMock container                                         |

WireMock is not a violation of the ban: it is a real process answering real
HTTP over a real socket, so the app's own client, serialization and error
handling all execute. Nothing is patched in process.

    pnpm test:e2e        api
    pnpm test:e2e:web    browser

**The OpenAPI document is checked in the stack tier, not in e2e.** The
`@nestjs/swagger` CLI plugin infers schemas during `nest build`, and the e2e
suite runs through vitest and swc, where the plugin never runs — so e2e sees a
poorer document than production serves. `scripts/smoke-stack.sh` asserts it
against the built image instead. E2E still checks that every route appears,
which comes from the decorators and is present either way.

**A test never writes to the database.** It signs in and calls endpoints, like
any client. If a test needs state the API cannot yet produce — a guest, say —
that is a missing endpoint, not a reason to reach for Prisma. Migrations are
the only thing applied directly.

**Every test creates its own identity.** `harness.signIn()` mints a fresh
subject, so tests share a database without sharing data. Nothing is truncated
between tests, and files run in parallel because there is no shared state to
protect. The cost: a test cannot assert on the database as a whole — no
"exactly one space exists" — which is a constraint worth having.

The browser suite drives the **production bundle** against a real api. Route
interception is mocking and is banned — if a test needs data, it creates it
through the real API. Offline is simulated with Playwright's own
`context.setOffline(true)`, which cuts the network at the driver level.

Selectors are user-visible only: text, roles, labels. Never a CSS class.

**E2E asserts behaviour, not shape.** The compiler already proves a mapper
cannot return an undeclared field, so listing a response's keys in a test
restates the type and breaks whenever a field is legitimately added. What a test
should assert is a promise the compiler cannot make — that a specific secret
never reaches the wire:

    expect(response.body).not.toHaveProperty('ownerId');

That guards the one gap the compiler leaves: returning a wider object, such as a
Prisma row, where an entity is declared. TypeScript allows it, because a wider
value assigned to a narrower type is not an object literal and gets no
excess-property check.

## What to write for a feature

- A `.spec.ts` beside every `*.rules.ts`. Not optional. A mapper gets none.
- One e2e per endpoint, covering the success path and each failure it can
  return.
- For a user-facing feature, a browser e2e over the flow, with an axe check.
- Nothing for a React component. Tier 1 covers the pure helpers in
  `apps/web/src/lib` only; `@testing-library/react` is not a dependency and is
  not to be added. A component is covered by the browser tier against the real
  stack, which the mock ban makes the only honest option.
- Nothing for the web's api types: they are generated from the api's OpenAPI
  document, and `make openapi-check` — a CI step — fails when the committed
  files are stale. See `docs/DECISIONS.md` § The web's api types are generated.
