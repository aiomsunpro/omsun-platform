#!/usr/bin/env bash
# Loads the migrations into a throwaway local PostgreSQL 16 database with a
# small Supabase stand-in (auth, storage, realtime) and runs the rule tests.
# Usage: scripts/test-db.sh   (needs initdb/pg_ctl/psql on PATH or PG_BIN set)
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
export PATH="$PG_BIN:$PATH"
DIR="$(mktemp -d)"
trap 'pg_ctl -D "$DIR/data" -m fast stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
initdb -D "$DIR/data" -U postgres -A trust >/dev/null
pg_ctl -D "$DIR/data" -o "-k $DIR -p 5499 -c listen_addresses=" -l "$DIR/log" -w start >/dev/null
PSQL=(psql -h "$DIR" -p 5499 -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f tests/db/supabase-stub.sql 2>/dev/null
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f tests/db/supabase-grants.sql
for t in tests/db/schema-test.sql tests/db/cash-book-test.sql tests/db/mitra-app-test.sql; do
  "${PSQL[@]}" -f "$t" | grep -E 'FAIL|TESTS PASSED| f$'
done
