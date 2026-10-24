-- Run once in the Supabase SQL editor. Separate names avoid touching website tables.
begin;
create table if not exists public.ndobol_rounds (
  id text primary key, state jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.ndobol_round_players (
  round_id text references public.ndobol_rounds(id), session_id text, player_id text not null,
  address text, token_hash text, slot int not null, animal text not null, bot boolean not null,
  name text not null, score bigint not null check(score >= 0), trash int not null check(trash >= 0),
  weight_grams bigint not null check(weight_grams >= 0), reward_wei text not null,
  pickup_json text not null, sync_beats int not null default 0,
  primary key(round_id, session_id)
);
create unique index if not exists ndobol_one_wallet_per_round on public.ndobol_round_players(round_id,address) where address is not null;
create table if not exists public.ndobol_signed_results (
  round_id text, session_id text, player_address text not null, nonce bigint not null,
  payload jsonb not null, created_at timestamptz not null default now(),
  primary key(round_id,session_id), unique(player_address,nonce),
  foreign key(round_id,session_id) references public.ndobol_round_players(round_id,session_id)
);
create table if not exists public.ndobol_nonces(address text primary key, next_nonce bigint not null default 0);
create table if not exists public.ndobol_sign_attempts(identity text primary key, window_start bigint not null, attempts int not null);
alter table public.ndobol_rounds enable row level security;
alter table public.ndobol_round_players enable row level security;
alter table public.ndobol_signed_results enable row level security;
alter table public.ndobol_nonces enable row level security;
alter table public.ndobol_sign_attempts enable row level security;
-- No browser role policies. Only the backend service role can use this RPC.
create or replace function public.ndobol_store(operation text, args jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  s jsonb; p jsonb; evidence jsonb; result jsonb; rid text; sid text; addr text;
  next_nonce bigint; attempts_count int; hash text;
begin
  if operation = 'persist' then
    s := args->'state'; rid := s->>'roundId';
    if s->>'mode' <> 'online' or s->>'phase' not in ('finished','results') then raise exception 'ROUND_NOT_AUTHORITATIVE'; end if;
    insert into public.ndobol_rounds(id,state) values(rid,s);
    for p in select value from jsonb_array_elements(s->'players') loop
      sid := p->>'id'; addr := lower(p->>'address');
      select m->>'tokenHash' into hash from jsonb_array_elements(args->'members') m where m->>'playerId'=sid limit 1;
      insert into public.ndobol_round_players(round_id,session_id,player_id,address,token_hash,slot,animal,bot,name,score,trash,weight_grams,reward_wei,pickup_json,sync_beats)
      values(rid,sid,coalesce(addr,rid||':'||sid),addr,hash,(p->>'slot')::int,p->>'animal',(p->>'bot')::boolean,p->>'name',
        (p->>'score')::bigint,(p->>'trash')::int,(p->>'weightGrams')::bigint,p->>'rewardWei',(p->'picked')::text,(p->>'syncBeats')::int);
    end loop;
    return 'true'::jsonb;
  elsif operation = 'evidence' then
    select to_jsonb(rp) || jsonb_build_object('track_id',r.state->>'trackId','duration_ms',round((r.state->>'elapsed')::numeric*1000),
      'completed',(r.state->>'completed')::boolean,'reason',r.state->>'reason','mode',r.state->>'mode','rules_version',(r.state->>'rulesVersion')::int)
      into result from public.ndobol_round_players rp join public.ndobol_rounds r on r.id=rp.round_id
      where rp.round_id=args->>'roundId' and rp.session_id=args->>'sessionId' and rp.token_hash=args->>'hash' and not rp.bot;
    return result;
  elsif operation = 'evidenceByToken' then
    select jsonb_build_object('session_id',session_id) into result from public.ndobol_round_players
      where round_id=args->>'roundId' and token_hash=args->>'hash' and not bot;
    return result;
  elsif operation = 'signed' then
    select payload into result from public.ndobol_signed_results where round_id=args->>'roundId' and session_id=args->>'sessionId';
    return result;
  elsif operation = 'nonce' then
    select n.next_nonce into next_nonce from public.ndobol_nonces n where address=args->>'address';
    return to_jsonb(coalesce(next_nonce,0));
  elsif operation = 'saveSignature' then
    evidence := args->'evidence'; p := args->'payload'; addr := evidence->>'address';
    insert into public.ndobol_nonces(address) values(addr) on conflict do nothing;
    select n.next_nonce into next_nonce from public.ndobol_nonces n where address=addr for update;
    if next_nonce <> (p->'message'->>'nonce')::bigint then raise exception 'NONCE_CONFLICT'; end if;
    insert into public.ndobol_signed_results(round_id,session_id,player_address,nonce,payload)
      values(evidence->>'round_id',evidence->>'session_id',addr,next_nonce,p);
    update public.ndobol_nonces n set next_nonce=n.next_nonce+1 where address=addr;
    return 'true'::jsonb;
  elsif operation = 'rate' then
    insert into public.ndobol_sign_attempts(identity,window_start,attempts) values(args->>'identity',(args->>'now')::bigint,1)
    on conflict(identity) do update set
      attempts=case when (args->>'now')::bigint-ndobol_sign_attempts.window_start >= (args->>'window')::bigint then 1 else ndobol_sign_attempts.attempts+1 end,
      window_start=case when (args->>'now')::bigint-ndobol_sign_attempts.window_start >= (args->>'window')::bigint then (args->>'now')::bigint else ndobol_sign_attempts.window_start end
    returning attempts into attempts_count;
    return to_jsonb(attempts_count <= (args->>'limit')::int);
  elsif operation = 'leaderboard' then
    select coalesce(jsonb_agg(to_jsonb(top_scores)), '[]'::jsonb) into result from (
      select name, score, round_id as "roundId" from (
        select distinct on (rp.player_id) rp.player_id,rp.name,rp.score,rp.round_id
        from public.ndobol_round_players rp join public.ndobol_rounds r on rp.round_id=r.id
        where r.state->>'trackId'=args->>'trackId' and not rp.bot and (r.state->>'rulesVersion')::int >= 5
        order by rp.player_id,rp.score desc,rp.round_id
      ) best order by score desc,player_id limit 10
    ) top_scores;
    return result;
  end if;
  raise exception 'INVALID_OPERATION';
end;
$$;
revoke all on function public.ndobol_store(text,jsonb) from public, anon, authenticated;
grant execute on function public.ndobol_store(text,jsonb) to service_role;
revoke all on public.ndobol_rounds,public.ndobol_round_players,public.ndobol_signed_results,public.ndobol_nonces,public.ndobol_sign_attempts from public,anon,authenticated;
grant select,insert,update on public.ndobol_rounds,public.ndobol_round_players,public.ndobol_signed_results,public.ndobol_nonces,public.ndobol_sign_attempts to service_role;
commit;
