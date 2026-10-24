import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";
import { createWalletAuth } from "../services/api/wallet-auth.js";
import { createApiServer } from "../services/api/server.js";
import { createSupabaseStore } from "../data/supabase-store.js";
import { createSigner } from "../services/api/signing/index.js";
import { GAME } from "../shared/game/config.js";
import { connect, flush, drive } from "./helpers.js";
import { tracks } from "../services/api/rooms/tracks.js";
const origin = "https://game.example.test";

test("wallet challenge rejects wrong signer, replay, wrong origin and expiry", async () => {
  let clock = 1_800_000_000_000;
  const auth = createWalletAuth({ now: () => clock }), a = privateKeyToAccount(generatePrivateKey()), b = privateKeyToAccount(generatePrivateKey());
  const c = auth.challenge(a.address, origin, "test");
  await assert.rejects(auth.verify(c.id, await b.signMessage({ message: c.message }), origin,"test"), /INVALID_SIGNATURE/);
  const c2 = auth.challenge(a.address, origin, "test"), signature = await a.signMessage({ message: c2.message });
  const session = await auth.verify(c2.id, signature, origin,"test");
  assert.equal(auth.authenticate(session.token, origin), a.address.toLowerCase());
  assert.equal(auth.authenticate(session.token, "https://evil.test"), null);
  await assert.rejects(auth.verify(c2.id, signature, origin,"test"), /INVALID_CHALLENGE/);
  const c3 = auth.challenge(a.address, origin, "test"); clock += 120001;
  await assert.rejects(auth.verify(c3.id, await a.signMessage({ message:c3.message }), origin,"test"), /INVALID_CHALLENGE/);
  const c4 = auth.challenge(a.address,origin,"test");
  await assert.rejects(auth.verify(c4.id, await a.signMessage({ message:c4.message }), "https://evil.test","test"), /INVALID_CHALLENGE/);
  clock += 6*60*60*1000;
  assert.equal(auth.authenticate(session.token, origin), null);
});

test("wallet-required API: login, create/join, address spoof rejection, round, signed MON proof and CORS", async t => {
  const key = generatePrivateKey(), signer = privateKeyToAccount(key);
  const api = createApiServer({ signing: { privateKey:key, rewardPool:"0x"+"12".repeat(20),claimsEnabled:true }, roomOptions: { manual:true,allowedOrigins:[origin],config:{...GAME,inputRate:1e6} } });
  api.listen(0,"127.0.0.1"); await once(api,"listening"); t.after(()=>api.dispose());
  const base = `http://127.0.0.1:${api.address().port}`, url = base.replace("http:","ws:")+"/rooms";
  const post = (route,body,headers={}) => fetch(base+route,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...headers},body:JSON.stringify(body)});
  const noWallet = await connect(url, { origin }); t.after(()=>noWallet.close());
  noWallet.send("create",{name:"Intruder",animal:"dog",trackId:"bengawan"});
  assert.equal((await noWallet.wait("error")).code,"WALLET_REQUIRED");
  const clients=[];
  for(let i=0;i<2;i++) {
    const a=privateKeyToAccount(generatePrivateKey());
    const c=await (await post("/auth/challenge",{address:a.address})).json();
    const loginResponse=await post("/auth/verify",{id:c.id,signature:await a.signMessage({message:c.message})});
    assert.equal(loginResponse.headers.get("access-control-allow-origin"),origin);
    const login=await loginResponse.json();
    const client=await connect(url,{origin,authToken:login.token}); client.login=login; clients.push(client); t.after(()=>client.close());
    const profile={name:`Wallet ${i}`,animal:"duck",address:a.address};
    if(i===0) {
      client.send("create",{...profile,address:"0x"+"ab".repeat(20),trackId:"bengawan"});
      assert.equal((await client.wait("error")).code,"WALLET_MISMATCH");
    }
    client.send(i?"join":"create",i?{...profile,code:clients[0].joined.code}:{...profile,trackId:"bengawan"});
    client.joined=await client.wait("joined");client.send("ready",{ready:true});
  }
  await clients[0].wait("snapshot",p=>p.state.players.length===2&&p.state.players.every(v=>v.ready));
  const old = clients[1], original = old.joined;
  old.close(); await new Promise(resolve => setTimeout(resolve, 20));
  const attacker = await connect(url,{origin,authToken:clients[0].login.token}); t.after(()=>attacker.close());
  attacker.send("resume",{code:original.code,token:original.token});
  assert.equal((await attacker.wait("error")).code,"WALLET_MISMATCH");
  const resumed = await connect(url,{origin,authToken:old.login.token}); t.after(()=>resumed.close());
  resumed.send("resume",{code:original.code,token:original.token});resumed.joined=await resumed.wait("joined");
  assert.equal(resumed.joined.slot,original.slot); assert.equal(resumed.joined.playerId,original.playerId);
  clients[1]=resumed;
  clients[0].send("start");await clients[0].wait("snapshot",p=>p.state.phase==="countdown");
  const room=api.roomServer.rooms.get(clients[0].joined.code);
  for(let tick=0;room.round.state.phase!=="results"&&tick<8000;tick++) {
    const state=room.round.state;
    if(state.phase==="running") clients.forEach((c,i)=>c.send("input",{roundId:state.roundId,seq:tick,...drive(state,tracks.bengawan,i)}));
    await flush(); api.roomServer.step();
  }
  assert.equal(room.round.state.completed,true);assert.equal(room.persistence.saved,true);
  const eligible=clients.find(c=>room.round.state.players.find(p=>p.id===c.joined.playerId).weightGrams>0);
  assert.ok(eligible,"a human collected reward-bearing litter");
  const body={roundId:room.round.state.roundId,playerId:eligible.joined.playerId}, headers={Authorization:`Bearer ${eligible.joined.token}`};
  const response=await post("/rounds/sign",body,headers);assert.equal(response.status,200);
  const proof=await response.json();
  assert.ok(await verifyTypedData({address:signer.address,domain:proof.domain,types:proof.types,primaryType:proof.primaryType,message:proof.message,signature:proof.signature}));
  assert.equal(proof.primaryType,"RoundReward");assert.equal(proof.claimEnabled,true);
  assert.equal(BigInt(proof.message.rewardWei),BigInt(proof.message.weightGrams)*10000000000n);
  assert.equal((await post("/rounds/sign",body,headers)).status,409);
  assert.equal((await post("/rounds/sign",{...body,score:999999},headers)).status,400);
  assert.equal((await post("/auth/challenge",{}, {Origin:"https://evil.test"})).status,403);
  assert.equal((await fetch(base+"/health",{method:"OPTIONS",headers:{Origin:origin}})).status,204);
});

test("Supabase adapter keeps service credentials server-side, awaits RPC and fails closed", async () => {
  const calls=[];
  const store=createSupabaseStore({url:"https://db.example.test",key:"server-test-key",fetcher:async(url,options)=>{
    calls.push({url:String(url),options});return {ok:true,json:async()=>[]};
  }});
  assert.deepEqual(await store.leaderboard("bengawan"),[]);
  assert.equal(calls[0].url,"https://db.example.test/rest/v1/rpc/ndobol_store");
  assert.equal(calls[0].options.headers.apikey,"server-test-key");
  assert.equal(calls[0].options.headers.Authorization,"Bearer server-test-key");
  assert.deepEqual(JSON.parse(calls[0].options.body),{operation:"leaderboard",args:{trackId:"bengawan"}});
  assert.throws(()=>store.persistRound({mode:"local"},[]),/ROUND_NOT_AUTHORITATIVE/);
  const broken=createSupabaseStore({url:"https://db.example.test",key:"test",fetcher:async()=>({ok:false,status:503})});
  await assert.rejects(broken.nonce("address"),/DATABASE_RPC_503/);
});

test("Supabase modern secret key uses apikey without an invalid JWT bearer; publishable key is rejected", async () => {
  const calls = [];
  const store = createSupabaseStore({ url: "https://db.example.test", key: "sb_secret_test-only", fetcher: async (_url, options) => {
    calls.push(options); return { ok: true, json: async () => [] };
  } });
  await store.leaderboard("bengawan");
  assert.equal(calls[0].headers.apikey, "sb_secret_test-only");
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.throws(() => createSupabaseStore({ url: "https://db.example.test", key: "sb_publishable_test-only" }), /SUPABASE_SERVER_KEY_REQUIRED/);
});

test("preparing a signer before deployment keeps games available but cannot enable an unconfigured pool", () => {
  const signing = { privateKey: generatePrivateKey(), verifyingContract: "", rewardPool: "", claimsEnabled: false, chainId: 10143 };
  const signer = createSigner({}, signing);
  assert.equal(signer.enabled, false);
  assert.deepEqual(signer.rewardConfig, { chainId: 10143, contract: null, enabled: false });
  assert.throws(() => createSigner({}, { ...signing, claimsEnabled: true }), /claims require a signer key and reward pool/);
  assert.throws(() => createSigner({}, { ...signing, chainId: 1 }), /Monad chain ID/);
});

test("async persistence never blocks ticks or reports saved before commit", async t => {
  const { createRoomManager } = await import("../services/api/rooms/manager.js");
  let resolve, calls=0;
  const manager=createRoomManager({persist:()=>{ calls++; return new Promise(r=>{resolve=r;}); }});
  t.after(()=>manager.close());
  const client={send(){}};manager.handle(client,"create",{name:"Async",animal:"dog",trackId:"bengawan"});
  const room=[...manager.rooms.values()][0];room.round.state.phase="finished";
  manager.step();const tick=room.round.state.tick;
  assert.equal(room.persistence.saving,true);assert.equal(room.persistence.saved,false);
  manager.step();assert.equal(room.round.state.tick,tick+1);assert.equal(calls,1);
  resolve();await flush();assert.equal(room.persistence.saved,true);
});
