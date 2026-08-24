#!/usr/bin/env bash
# Exercises the running docker compose stack over real HTTP, the way a client
# would. Assumes `make up` has completed.
set -euo pipefail

API=${API:-http://localhost:3000}
WEB=${WEB:-http://localhost:5173}
OIDC=${OIDC:-http://localhost:8081}

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; exit 1; }

[ "$(curl -sS "$API/health")" = '{"status":"ok"}' ] || fail "api health"
pass "api health"

[ "$(curl -sS "$WEB/healthz")" = 'ok' ] || fail "web health"
pass "web health"

[ "$(curl -sS "$WEB/api/health")" = '{"status":"ok"}' ] || fail "web proxies /api"
pass "web proxies /api"

curl -sS "$API/openapi.json" | grep -q '"/spaces"' || fail "openapi served"
pass "openapi served"

TOKEN=$(curl -sS -i "$OIDC/authorize?redirect_uri=$WEB" | grep -i '^location:' | sed 's/.*id_token=//' | tr -d '\r\n')
[ -n "$TOKEN" ] || fail "local provider issues a token"
pass "local provider issues a token"

AUTH=$(curl -sS -X POST "$API/auth/google" -H 'content-type: application/json' -d "{\"idToken\":\"$TOKEN\"}")
ACCESS=$(printf '%s' "$AUTH" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[ -n "$ACCESS" ] || fail "sign in"
pass "sign in"

curl -sS "$API/auth/me" -H "authorization: Bearer $ACCESS" | grep -q '"email"' || fail "GET /auth/me"
pass "GET /auth/me"

SPACE=$(curl -sS -X POST "$API/spaces" -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' -d '{"name":"Smoke","description":"stack check"}')
ID=$(printf '%s' "$SPACE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
[ -n "$ID" ] || fail "create a space"
pass "create a space"

curl -sS "$API/spaces" -H "authorization: Bearer $ACCESS" | grep -q "$ID" || fail "list spaces"
pass "list spaces"

curl -sS -X PATCH "$API/spaces/$ID" -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' -d '{"name":"Smoke renamed"}' | grep -q 'Smoke renamed' || fail "edit a space"
pass "edit a space"

[ "$(curl -sS -o /dev/null -w '%{http_code}' "$API/spaces")" = '401' ] || fail "anonymous is refused"
pass "anonymous is refused"

[ "$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/spaces" -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' -d '{"name":"  "}')" = '422' ] || fail "invalid input is refused"
pass "invalid input is refused"

[ "$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "$API/spaces/$ID" -H "authorization: Bearer $ACCESS")" = '204' ] \
  || fail "delete a space"
pass "delete a space"

echo "stack smoke: every check passed"
