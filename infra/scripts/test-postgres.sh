#!/usr/bin/env bash
set -euo pipefail
# Test database only: the URL must be explicitly supplied. No production default.
: "${TEST_DATABASE_URL:?Use a disposable PostgreSQL test database}"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
  if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end$$;
SQL
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f data/supabase/001_game.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/supabase.sql
