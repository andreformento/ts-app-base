# Stack

Every dependency, and why it is here. Adding one is a decision: record it in
`docs/DECISIONS.md`. Do not add a library that duplicates something below.

## Shared

| Package                    | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| TypeScript                 | maximum strictness, one `tsconfig.base.json` at the root     |
| Zod                        | the only schema and validation library. Used in `wire/` only |
| Vitest                     | the only test runner, both apps, both tiers                  |
| ESLint + typescript-eslint | `strictTypeChecked`, escapes banned                          |
| eslint-plugin-boundaries   | makes the import matrix a lint error, not prose              |
| Prettier                   | formatting                                                   |
| pnpm workspaces            | monorepo. No Turborepo — two workspaces do not need it       |

## apps/api

| Package        | Role                                                              |
| -------------- | ----------------------------------------------------------------- |
| NestJS         | HTTP server. Confined to `diplomat/in`                            |
| Prisma         | database client and migrations. Confined to `diplomat/out`        |
| jose           | Google ID-token verification against JWKS; signing our own tokens |
| Testcontainers | real Docker dependencies in e2e                                   |
| Playwright     | browser e2e, driving the production bundle against the real stack |
| axe-core       | accessibility assertions inside browser e2e                       |
| supertest      | drives real HTTP against the booted app in e2e                    |

OpenAPI is generated from the Zod schemas in `wire/` using Zod 4's built-in
`z.toJSONSchema`, so no generator dependency is needed.

Deliberately absent: `class-validator` and `class-transformer` (Zod does this),
`@nestjs/swagger` (it reads `class-validator` decorators we do not have),
`zod-to-openapi` (Zod 4 does it natively), Passport (see `docs/DECISIONS.md`
§ Auth).

## apps/web

| Package                                 | Role                                                                  |
| --------------------------------------- | --------------------------------------------------------------------- |
| React + Vite                            | UI and build                                                          |
| vite-plugin-pwa                         | installable PWA with an offline app shell                           |
| TanStack Query                          | server state: cache, optimistic mutations, pagination |
| TanStack Router                         | typed routes and search params                                        |
| React Hook Form + `@hookform/resolvers` | forms, validated against the same Zod schema the api parses           |
| Tailwind CSS                            | styling, themed through CSS variables                          |
| shadcn/ui                               |                  |

## Rules

The type, comment and mock rules live in `CLAUDE.md` § Non-negotiables and are
not restated here. Dependency-specific rules:

- No mocking library, in any tier.
- No date library until a real need appears; pass `now: Date` into pure
  functions rather than reading the clock inside them.
- No state-management library. Server state is TanStack Query; local state is
  React state.

