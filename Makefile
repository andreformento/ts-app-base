.PHONY: env build run down stop clean logs ps smoke test

COMPOSE := docker compose $(COMPOSE_FILES)

env:
	@test -f .env || (cp .env.example .env && echo "created .env from .env.example")

build: env
	$(COMPOSE) build

run: env
	@$(COMPOSE) up --build -d --wait
	@set -a; . ./.env; set +a; printf '\n  \033[32mready\033[0m\n\n    web      http://localhost:%s\n    api      http://localhost:%s\n    openapi  http://localhost:%s/openapi.json\n\n  make logs    follow output\n  make smoke   exercise it over real HTTP\n  make down    stop it\n\n' "$$WEB_PORT" "$$API_PORT" "$$API_PORT"

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

test:
	pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm test:e2e:web
