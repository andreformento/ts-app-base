FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @appname/api...
COPY apps/api apps/api
RUN pnpm --filter @appname/api prisma:generate && pnpm --filter @appname/api build

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter @appname/api...
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/src/wire/db apps/api/src/wire/db
RUN pnpm --filter @appname/api prisma:generate

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=deps /app/apps/api/src/wire/db ./apps/api/src/wire/db
COPY --from=build /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=1s --timeout=1s --start-period=1s --retries=30 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT??3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
