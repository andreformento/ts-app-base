FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG VITE_OIDC_AUTHORIZE_URL=http://localhost:8081/authorize
ENV VITE_OIDC_AUTHORIZE_URL=$VITE_OIDC_AUTHORIZE_URL
ENV CI=true
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @appname/web...
COPY apps/web apps/web
RUN pnpm --filter @appname/web build

FROM nginx:alpine AS runtime
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=1s --timeout=1s --start-period=1s --retries=15 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1
