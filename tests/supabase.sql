-- Roll back test records so the script can be repeated.
begin;
do $$declare result jsonb; s jsonb; e jsonb; proof jsonb; begin
  if has_function_privilege('anon','public.ndobol_store(text,jsonb)','execute') or has_function_privilege('authenticated','public.ndobol_store(text,jsonb)','execute') then raise exception 'RPC exposed'; end if;
  if has_table_privilege('anon','public.ndobol_round_players','select') then raise exception 'evidence exposed'; end if;
  s := '{"roundId":"sql-test","mode":"online","phase":"results","trackId":"bengawan","elapsed":100,"completed":true,"reason":"finish","rulesVersion":5,"players":[{"id":"p1","address":"0x1111111111111111111111111111111111111111","slot":0,"animal":"dog","bot":false,"name":"SQL tester","score":35,"trash":1,"weightGrams":35,"rewardWei":"350000000000","picked":[0],"syncBeats":0}]}'::jsonb;
  perform public.ndobol_store('persist',jsonb_build_object('state',s,'members','[{"playerId":"p1","tokenHash":"test-hash"}]'::jsonb));
  e := public.ndobol_store('evidence','{"roundId":"sql-test","sessionId":"p1","hash":"test-hash"}');
  if e->>'weight_grams' <> '35' or e->>'duration_ms' <> '100000' then raise exception 'invalid evidence %',e; end if;
  if public.ndobol_store('evidence','{"roundId":"sql-test","sessionId":"p1","hash":"stolen"}') is not null then raise exception 'token bypass'; end if;
  result := public.ndobol_store('leaderboard','{"trackId":"bengawan"}');
  if jsonb_array_length(result)<>1 or result->0->>'score'<>'35' then raise exception 'leaderboard failed %',result; end if;
  proof := '{"message":{"nonce":"0"},"signature":"test-only"}'::jsonb;
  perform public.ndobol_store('saveSignature',jsonb_build_object('evidence',e,'payload',proof));
  if public.ndobol_store('nonce','{"address":"0x1111111111111111111111111111111111111111"}') <> '1'::jsonb then raise exception 'nonce failed'; end if;
  begin
    perform public.ndobol_store('saveSignature',jsonb_build_object('evidence',e,'payload',proof));
    raise exception 'duplicate accepted';
  exception when raise_exception then
    if sqlerrm <> 'NONCE_CONFLICT' then raise; end if;
  end;
  if public.ndobol_store('signed','{"roundId":"sql-test","sessionId":"p1"}') <> proof then raise exception 'proof missing'; end if;
  if public.ndobol_store('rate','{"identity":"tester","now":1000,"window":60000,"limit":1}') <> 'true'::jsonb then raise exception 'rate init'; end if;
  if public.ndobol_store('rate','{"identity":"tester","now":1001,"window":60000,"limit":1}') <> 'false'::jsonb then raise exception 'rate bypass'; end if;
  if public.ndobol_store('rate','{"identity":"tester","now":61000,"window":60000,"limit":1}') <> 'true'::jsonb then raise exception 'rate reset'; end if;
end$$;
set local role service_role;
select public.ndobol_store('leaderboard','{"trackId":"bengawan"}');
reset role;
rollback;
