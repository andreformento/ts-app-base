.PHONY: env up down stop clean logs ps smoke test openapi openapi-check

COMPOSE := docker compose $(COMPOSE_FILES)

env:
	@test -f .env || (cp .env.example .env && echo "created .env from .env.example")

up: env
	@$(COMPOSE) up --build -d --wait
	@set -a; . ./.env; set +a; printf '\n  \033[32mready\033[0m\n\n    web      http://localhost:%s\n    api      http://localhost:%s\n    docs     http://localhost:%s/docs\n\n  make logs    follow output\n  make smoke   exercise it over real HTTP\n  make down    stop it\n\n' "$$WEB_PORT" "$$API_PORT" "$$API_PORT"

down:
	$(COMPOSE) down

stop: down

clean:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f $(ARGS)

ps:
	$(COMPOSE) ps

smoke:
	./scripts/smoke-stack.sh

openapi:
	pnpm --filter @appname/api run openapi
	pnpm --filter @appname/web run codegen

openapi-check: openapi
	git diff --exit-code -- apps/api/openapi.json apps/web/src/types/api.ts

test:
	pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm test:e2e:web
