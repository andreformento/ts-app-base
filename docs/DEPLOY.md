# Deploy

**The target host is an OPEN DECISION.** Do not assume one, and do not add
provider-specific configuration until it is made.

The tension to resolve: NestJS wants a persistent process, and cheap persistent
hosting is scarce. Candidates (Cloud Run, Fly.io/Railway/Render, a single VPS)
should be validated against current offerings when you deploy, not assumed up
front. Until then nothing in the code depends on a platform.

## What is settled: the build outputs

CI produces two artifacts, both host-agnostic:

1. **api** — a Docker image (`apps/api/Dockerfile`) running the compiled
   server. Multi-stage, production dependencies only, runs as the `node` user,
   with a `HEALTHCHECK` hitting the health endpoint. CI does not merely build
   it: it starts the image against a real Postgres, applies migrations, asserts
   the health endpoint answers, asserts the process is not root, and stops it
   with `SIGTERM`.
2. **web** — a static bundle (`vite build`), uploaded as a CI artifact and
   deployable to any static host or CDN. It calls the api at `/api`, which the
   host proxies.

Build and run the image locally:

    docker build -f apps/api/Dockerfile -t appname-api .
    docker run --rm -e DATABASE_URL=... -e AUTH_SECRET=... appname-api

The image carries the Prisma CLI so migrations can be applied from the same
artifact that runs the server:

    docker run --rm -e DATABASE_URL=... appname-api \
      node node_modules/prisma/build/index.js migrate deploy

That is why `prisma` is a runtime dependency rather than a dev one, and it is
most of the image's size. Shipping a second migration image would be smaller
but would let the schema and the server drift apart.

Keeping the api a plain container is deliberate: it keeps every candidate host
open. Nothing in the code may depend on a specific platform's runtime, and no
platform SDK is a dependency.

## Runtime contract

The api must:

- read all configuration from environment variables, validated at boot
  (`docs/STRUCTURE.md` § Environment);
- listen on the port given by `PORT`;
- expose `GET /health`, returning 200 only when the database is reachable and
  503 otherwise;
- log structured JSON to stdout, never to files;
- shut down cleanly on `SIGTERM`, draining in-flight requests;
- store no state on local disk — the filesystem is ephemeral.

## Database

Postgres. Migrations are Prisma migrations in `apps/api/src/wire/db/migrations`
and run as an explicit deploy step (`prisma migrate deploy`), never
automatically at application boot.
