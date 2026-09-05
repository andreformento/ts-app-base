# Deploy

**The target host is an open decision.** Nothing in the code depends on a
platform and no platform SDK is a dependency.

## Build outputs

1. **api** — a Docker image from `apps/api/Dockerfile`. Multi-stage, production
   dependencies only, runs as `node`, with a `HEALTHCHECK` on `/health`. CI does
   not merely build it: it starts the image against a real Postgres, applies
   migrations from the image, asserts `/health` answers, asserts the process is
   not root, and stops it with `SIGTERM`.
2. **web** — a static bundle (`vite build`), uploaded as a CI artifact. It calls
   the api at `/api`, which the host proxies.

## Runtime contract

The api must:

- read configuration from environment variables, validated at boot;
- listen on `PORT`;
- answer `GET /health` with 200 only when the database is reachable, 503
  otherwise;
- log structured output to stdout;
- shut down on `SIGTERM` without waiting on idle keep-alive sockets, or every
  rollout stalls for the full grace period;
- keep no state on local disk.

## Migrations

`prisma migrate deploy`, as an explicit deploy step, never at application boot.
The image carries the Prisma CLI so migrations run from the same artifact that
runs the server:

    docker run --rm -e DATABASE_URL=... <image> \
      node node_modules/prisma/build/index.js migrate deploy
