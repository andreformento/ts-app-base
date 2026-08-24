# Testing

Two tiers. Nothing between them.

## The mock ban

**Mocks are prohibited in every tier, without exception.** No `vi.mock`, no
stub objects, no hand-written in-process fakes, no dependency substitution
through the Nest DI container.

If a test seems to need a mock, the code under test is in the wrong layer. Move
the decision into a pure function in `logic` and unit-test it there; leave the
I/O in `diplomat`, where e2e covers it.

## Tier 1 — unit

Covers `logic/` and `adapter/` only. Both are pure, so a mock is never needed.

    logic/<feature>.spec.ts     REQUIRED alongside every logic file
    adapter/**/<name>.spec.ts   REQUIRED alongside every adapter file

Pure means: same input, same output, no I/O, no clock, no randomness, no
state. A function needing the current time takes `now: Date` as a parameter.

Adapters are the trusted boundary — `model` carries no runtime validation, so a
mis-mapped field is caught only here. Test every field, both directions.

    pnpm test

## Tier 2 — e2e

Covers everything else: `application/`, `diplomat/in`, `diplomat/out`, and the
wiring between them. All orchestration and I/O correctness rides on this tier.
That is the deliberate price of banning mocks.

An e2e test boots the real application and calls its real HTTP endpoints. It
never imports an internal function to call it directly.

Every external dependency runs as a real Docker container via Testcontainers:

| Dependency                              | Container                       |
| --------------------------------------- | ------------------------------- |
| Database                                | the real `postgres` image       |
| Object storage                          | the real `minio` image (S3 API) |
| Third party publishing a runnable image | that image                      |
| Third party publishing none             | a WireMock container            |

WireMock is permitted and is not a violation of the mock ban: it is a real
process answering real HTTP over a real socket. The app's own HTTP client,
serialization and error handling all execute. Nothing is patched in process.
It is also the only way to exercise 500s and timeouts on demand.

Requires a running Docker daemon.

    pnpm test:e2e        api
    pnpm test:e2e:web    browser

To run one file or one test, see `docs/STRUCTURE.md` § Commands.

## Tier 2 in the browser — frontend e2e

The web app is tested the same way the api is: against reality. The browser
drives the real production bundle, which calls a real api, which talks to a
real database — all in containers.

**Route interception is mocking and is banned.** No `page.route()` stubbing of
our own API, no fixture responses, no service-worker fakes. If the frontend
needs data, create it through the real API.

Setup, per run:

    postgres container  ->  real database, migrated
    api container       ->  the real api image
    web                 ->  the PRODUCTION build (`vite build` + preview),
                            never the dev server
    OAuth               ->  a containerized mock-oauth2 server image
                            (a real image, so it is permitted; see the table above)

Rules:

- Tests drive the UI as a user does: visible text, roles and labels. Never a
  CSS class or a test-only DOM hook that users cannot see.
- Test data is created through the real API, never by writing to the database.
- Web-first assertions only. No fixed sleeps — wait for state, not for time.
- Every test is independent and can run in parallel against its own data.
- Failures produce a trace, a screenshot and a video.
- Accessibility is asserted in-test (axe): the CRUD form must be operable by
  keyboard and its errors announced.
- Offline is simulated with Playwright's own `context.setOffline(true)`, which
  cuts the browser's network at the driver level. That is NOT mocking: nothing
  in the app is patched, and the app's real offline path runs. Faking the
  service worker or intercepting routes to simulate offline remains banned.
- The same suite runs in CI, against the same containers.

**There are no component tests.** Components are `diplomat/in` and hold no
logic, so there is nothing to unit-test in them — and a component test would
immediately require mocking the data layer, which is banned. Anything decidable
belongs in `logic`, where it is unit-tested without a browser.

## What to write for a new feature

- A `.spec.ts` beside every `logic` and `adapter` file. Not optional.
- At least one e2e test per endpoint, covering the success path and each
  error path the endpoint can return.
- For a user-facing feature, a browser e2e covering the flow a user performs,
  including its failure and offline states.

No test file is written for `model`, `wire`, `application` or `diplomat`.
