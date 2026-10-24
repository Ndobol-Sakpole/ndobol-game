-- Run after 001_game.sql. Private, durable sponsored transaction outbox.
begin;
create table if not exists public.ndobol_sponsored_claims (
  id text primary key, day text not null, max_fee_wei numeric(78,0) not null,
  status text not null check(status in ('pending','confirmed','failed')), payload jsonb not null
);
alter table public.ndobol_sponsored_claims enable row level security;
create or replace function public.ndobol_relay(operation text, args jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r jsonb; result jsonb; spent numeric;
begin
  if operation = 'get' then
    select payload into result from public.ndobol_sponsored_claims where id=args->>'id';
    return result;
  elsif operation = 'pending' then
    select coalesce(jsonb_agg(payload), '[]'::jsonb) into result from public.ndobol_sponsored_claims where status='pending';
    return result;
  elsif operation = 'reserve' then
    -- The supported deployment has one API process; this lock also makes budget reservation atomic.
    perform pg_catalog.pg_advisory_xact_lock(10143, 20261024);
    r := args->'record';
    if exists(select 1 from public.ndobol_sponsored_claims where id=r->>'id') then return 'true'::jsonb; end if;
    select coalesce(sum(max_fee_wei),0) into spent from public.ndobol_sponsored_claims where day=r->>'day';
    if spent + (r->>'maxFeeWei')::numeric > (args->>'dailyLimit')::numeric then return 'false'::jsonb; end if;
    insert into public.ndobol_sponsored_claims values(r->>'id', r->>'day', (r->>'maxFeeWei')::numeric, r->>'status', r);
    return 'true'::jsonb;
  elsif operation = 'update' then
    r := args->'record';
    update public.ndobol_sponsored_claims set status=r->>'status', payload=r where id=r->>'id';
    return 'true'::jsonb;
  end if;
  raise exception 'INVALID_OPERATION';
end;
$$;
revoke all on public.ndobol_sponsored_claims from public, anon, authenticated;
grant select,insert,update on public.ndobol_sponsored_claims to service_role;
revoke all on function public.ndobol_relay(text,jsonb) from public,anon,authenticated;
grant execute on function public.ndobol_relay(text,jsonb) to service_role;
commit;
