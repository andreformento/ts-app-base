#!/usr/bin/env bash
# Names this project. Rewrites every occurrence of the placeholder, writes a
# project README, then removes itself and TEMPLATE.md.
set -euo pipefail

PLACEHOLDER=appname

usage() {
  echo "usage: scripts/init.sh <project-name>" >&2
  echo "  lowercase letters, digits and hyphens, starting with a letter" >&2
  exit 1
}

[ $# -eq 1 ] || usage
NAME=$1

echo "$NAME" | grep -Eq '^[a-z][a-z0-9-]{1,38}$' || usage
[ "$NAME" != "$PLACEHOLDER" ] && true

cd "$(dirname "$0")/.."

if ! grep -rql "$PLACEHOLDER" --exclude-dir=.git --exclude-dir=node_modules . 2>/dev/null; then
  echo "nothing to rename: this project has already been initialised" >&2
  exit 1
fi

FILES=$(grep -rl "$PLACEHOLDER" --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null)
COUNT=$(printf '%s\n' "$FILES" | grep -c . || true)

printf '%s\n' "$FILES" | while read -r file; do
  [ -n "$file" ] || continue
  sed -i "s/${PLACEHOLDER}/${NAME}/g" "$file"
done

cat > README.md <<EOF
# ${NAME}

A TypeScript monorepo: a NestJS api and a React PWA, written the way each
framework is normally written, tested against real containers with no mocks.

- \`apps/api\` — NestJS, Postgres, Prisma
- \`apps/web\` — React, Vite, TanStack Query and Router, PWA

Rules live in \`CLAUDE.md\` and \`docs/\`. They describe the code and are kept
in step with it: type discipline, the mock ban and the test tiers are enforced
by tooling and CI.

## Requirements

Node >= 22.12, pnpm 10 (\`corepack enable\`), Docker.

## Running

\`\`\`sh
make up           # builds, starts in the background, prints the urls
\`\`\`

The stack includes a local identity provider, so sign-in works with no external
request. \`make logs\` follows output, \`make down\` stops it, \`make clean\`
also drops the database volume.

Without Docker:

\`\`\`sh
pnpm install
pnpm dev          # api on :3000, web on :5173
\`\`\`

## Verifying

\`\`\`sh
pnpm typecheck
pnpm lint
pnpm test         # unit: the pure rules, no mocks
pnpm test:e2e     # api against real containers
pnpm test:e2e:web # browser against the real stack
make test         # all of the above, as CI runs it
make smoke        # exercise the running stack over real HTTP
make openapi      # re-emit the api document and the web's generated types
\`\`\`

Every external dependency in a test is a real Docker container. There are no
mocks in this repository — see \`docs/TESTING.md\`.
EOF

rm -f TEMPLATE.md "$0"

echo "renamed ${PLACEHOLDER} -> ${NAME} across ${COUNT} files"
echo
echo "next:"
echo "  pnpm install"
echo "  make test          # everything should pass before you write anything"
echo "  write PRODUCT.md   # it is what an agent reads to know what to build"
