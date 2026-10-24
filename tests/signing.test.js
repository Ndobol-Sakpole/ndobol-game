import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { verifyTypedData, keccak256, toHex } from "viem";
import { createStore } from "../data/store.js";
import { createSigner } from "../services/api/signing/index.js";
import { createApiServer } from "../services/api/server.js";
import { createRound } from "../shared/game/round.js";
import { tracks } from "../services/api/rooms/tracks.js";
import { tokenHash } from "../services/api/rooms/manager.js";
const address = "0x1111111111111111111111111111111111111111",
  verifier = "0x2222222222222222222222222222222222222222";
function evidence(
  store,
  { playerAddress = address, trackId = "bengawan", id = randomUUID(), fatal = null } = {},
) {
  const token = randomBytes(32).toString("hex"),
    round = createRound(tracks[trackId], { roundId: id, mode: "online", raftId: fatal === "sunk" ? "ban-bekas" : "bambu-polos" });
  round.addPlayer({
    id: "human",
    name: "Tester",
    animal: "duck",
    slot: 0,
    address: playerAddress,
    connected: true,
  }).ready = true;
  for (let i = 1; i < 4; i++)
    round.addPlayer({
      id: `bot-${i}`,
      name: `Bot ${i}`,
      animal: "duck",
      slot: i,
      bot: true,
    });
  round.start();
  for (let i = 0; i < 8000 && round.state.phase !== "results"; i++) {
    round.queueInput("human", { seq: i, fart: i % 30 === 0, reach: i % 80 < 40 ? -1 : 1 });
    if (fatal && round.state.phase === "running" && round.state.players[0].trash > 0) {
      if (fatal === "capsized") round.state.roll = 1.3;
      else round.state.floats = [0, 0, 0, 0];
    }
    round.step();
  }
  assert.equal(round.state.completed, !fatal);
  store.persistRound(round.snapshot(), [
    { playerId: "human", tokenHash: tokenHash(token) },
  ]);
  return { roundId: id, playerId: "human", token, state: round.snapshot() };
}
function setup(t) {
  const store = createStore(),
    privateKey = generatePrivateKey(),
    signer = createSigner(store, {
      privateKey,
      chainId: 10143,
      verifyingContract: verifier,
      rewardPool: verifier,
    });
  t.after(() => store.close());
  return { store, signer, privateKey };
}
test("EIP-712 recovers the configured signer; score/domain tampering fails", async (t) => {
  const { store, signer, privateKey } = setup(t),
    e = evidence(store),
    proof = await signer.sign(e, e.token);
  assert.equal(proof.message.player, address);
  assert.equal(proof.message.roundId, keccak256(toHex(e.roundId)));
  assert.equal(proof.message.trackId, keccak256(toHex("bengawan")));
  assert.equal(proof.claimEnabled, false);
  assert.equal(proof.message.score, String(e.state.players[0].score));
  const args = {
    address: privateKeyToAccount(privateKey).address,
    domain: proof.domain,
    types: proof.types,
    primaryType: proof.primaryType,
    message: proof.message,
    signature: proof.signature,
  };
  assert.equal(await verifyTypedData(args), true);
  assert.equal(
    await verifyTypedData({
      ...args,
      message: { ...proof.message, score: "999999" },
    }),
    false,
  );
  assert.equal(
    await verifyTypedData({
      ...args,
      domain: { ...proof.domain, chainId: 143 },
    }),
    false,
  );
  assert.deepEqual(await signer.get(e.roundId, e.token), proof);
});
test("concurrent duplicate signing issues one signature; nonces persist across rounds and restart", async (t) => {
  const folder = mkdtempSync(path.join(tmpdir(), "ndobol-sign-")),
    file = path.join(folder, "test.sqlite");
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  let store = createStore(file);
  const options = {
    privateKey: generatePrivateKey(),
    chainId: 10143,
    verifyingContract: verifier,
      rewardPool: verifier,
  };
  let signer = createSigner(store, options);
  const a = evidence(store);
  const results = await Promise.allSettled([
    signer.sign(a, a.token),
    signer.sign(a, a.token),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    results.find((r) => r.status === "rejected").reason.code,
    "ALREADY_SIGNED",
  );
  assert.equal(
    results.find((r) => r.status === "fulfilled").value.message.nonce,
    "0",
  );
  store.close();
  store = createStore(file);
  signer = createSigner(store, options);
  t.after(() => store.close());
  const b = evidence(store, { trackId: "mahakam" });
  const proof = await signer.sign(b, b.token);
  assert.equal(proof.message.nonce, "1");
  assert.equal(
    store.db.prepare("SELECT count(*) AS n FROM signed_results").get().n,
    2,
  );
});
test("guest, stolen session, missing key, impossible score and rate limits fail closed", async (t) => {
  const { store, signer } = setup(t),
    e = evidence(store),
    guest = evidence(store, { playerAddress: null });
  await assert.rejects(signer.sign(guest, guest.token), {
    code: "GUEST_RESULT",
  });
  await assert.rejects(signer.sign(e, guest.token), {
    code: "RESULT_NOT_OWNED",
  });
  const disabled = createSigner(store, { privateKey: null });
  await assert.rejects(disabled.sign(e, e.token), { code: "SIGNING_DISABLED" });
  store.db
    .prepare(
      "UPDATE round_players SET score=999999 WHERE round_id=? AND session_id=?",
    )
    .run(e.roundId, "human");
  await assert.rejects(signer.sign(e, e.token), { code: "IMPOSSIBLE_RESULT" });
  let rateError;
  for (let i = 0; i < 7; i++) {
    try {
      await signer.sign(e, e.token);
    } catch (error) {
      rateError = error;
    }
  }
  assert.equal(rateError.code, "SIGN_RATE_LIMIT");
  assert.equal(
    store.db.prepare("SELECT count(*) AS n FROM signed_results").get().n,
    0,
  );
});
test("migration preserves Phase 1 archives, applies once, and foreign keys stay valid", (t) => {
  const folder = mkdtempSync(path.join(tmpdir(), "ndobol-migrate-")),
    file = path.join(folder, "v1.sqlite");
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const old = new DatabaseSync(file);
  old.exec(
    readFileSync(
      new URL("../data/migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  old.exec(
    "INSERT INTO players(id,display_name) VALUES('old','Old'); INSERT INTO rounds(id,player_id,track_id,score,trash_count,duration_ms) VALUES('legacy','old','bengawan',100,1,1000); INSERT INTO leaderboard(player_id,track_id,best_score,round_id) VALUES('old','bengawan',100,'legacy');",
  );
  old.close();
  let store = createStore(file);
  assert.equal(
    store.db.prepare("SELECT score FROM rounds_v1").get().score,
    100,
  );
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM rounds").get().n, 0);
  assert.deepEqual(store.db.prepare("PRAGMA foreign_key_check").all(), []);
  store.close();
  store = createStore(file);
  assert.equal(store.db.prepare("PRAGMA user_version").get().user_version, 5);
  store.close();
});
test("leaderboard returns 10 best scores independently per track", (t) => {
  const { store } = setup(t);
  for (let i = 0; i < 12; i++)
    evidence(store, {
      playerAddress: `0x${(i + 10).toString(16).padStart(40, "0")}`,
    });
  evidence(store, { trackId: "mahakam" });
  assert.equal(store.leaderboard("bengawan").length, 10);
  assert.equal(store.leaderboard("mahakam").length, 1);
  assert.ok(
    store
      .leaderboard("bengawan")
      .every((r, i, rows) => i === 0 || rows[i - 1].score >= r.score),
  );
});
test("HTTP signing accepts identifiers only, authenticates, persists and recovers proof", async (t) => {
  const api = createApiServer({ walletRequired: false,
    signing: {
      privateKey: generatePrivateKey(),
      chainId: 10143,
      verifyingContract: verifier,
      rewardPool: verifier,
    },
    roomOptions: { manual: true },
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  t.after(() => api.dispose());
  const e = evidence(api.store),
    url = `http://127.0.0.1:${api.address().port}`,
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${e.token}`,
    },
    body = JSON.stringify({ roundId: e.roundId, playerId: e.playerId });
  assert.equal((await (await fetch(url + "/health")).json()).signing, true);
  assert.equal(
    (
      await fetch(url + "/rounds/sign", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...JSON.parse(body), score: 999 }),
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(url + "/rounds/sign", { method: "POST", body })).status,
    401,
  );
  const signed = await fetch(url + "/rounds/sign", {
    method: "POST",
    headers,
    body,
  });
  assert.equal(signed.status, 200);
  const proof = await signed.json();
  assert.equal(
    (await fetch(url + "/rounds/sign", { method: "POST", headers, body }))
      .status,
    409,
  );
  assert.deepEqual(
    await (
      await fetch(url + `/rounds/result?roundId=${e.roundId}`, { headers })
    ).json(),
    proof,
  );
  assert.equal(
    (await (await fetch(url + "/leaderboard?track=bengawan")).json()).entries
      .length,
    1,
  );
  assert.equal((await fetch(url + "/leaderboard?track=unknown")).status, 400);
});

test("existing Phase 1 wallet identity is reused regardless of address letter case", (t) => {
  const { store } = setup(t),
    wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  store.db
    .prepare(
      "INSERT INTO players(id,wallet_address,display_name) VALUES(?,?,?)",
    )
    .run("legacy-wallet", `0x${"A".repeat(40)}`, "Legacy");
  const e = evidence(store, { playerAddress: wallet });
  assert.equal(
    store.evidence(e.roundId, "human", tokenHash(e.token)).player_id,
    "legacy-wallet",
  );
});

test("legacy rules-v3 results keep their original synchrony scoring when signed", async (t) => {
  const { store, signer } = setup(t),
    e = evidence(store);
  store.db
    .prepare("UPDATE rounds SET rules_version=3 WHERE id=?")
    .run(e.roundId);
  store.db
    .prepare(
      "UPDATE round_players SET sync_beats=1,score=trash*100+508 WHERE round_id=? AND session_id=?",
    )
    .run(e.roundId, e.playerId);
  const proof = await signer.sign(e, e.token);
  assert.equal(Number(proof.message.score), e.state.players[0].trash * 100 + 508);
});

const { encodeRewardClaim } = await import("../shared/reward-claim.js");
const { encodeFunctionData } = await import("viem");
test("server binds exact mass and native payout; browser calldata matches compiled ABI", async t => {
  const { store, privateKey } = setup(t);
  const signer = createSigner(store, { privateKey, rewardPool: verifier, chainId: 10143, claimsEnabled: true });
  const e = evidence(store), proof = await signer.sign(e, e.token);
  assert.equal(proof.primaryType, "RoundReward");
  assert.equal(proof.domain.name, "NdobolRiverRewards");
  assert.equal(proof.message.weightGrams, String(e.state.players[0].weightGrams));
  assert.equal(proof.message.rewardWei, String(BigInt(proof.message.weightGrams) * 10_000_000_000n));
  assert.ok(e.state.players.filter(p => p.bot).every(p => p.rewardWei === "0"));
  const abi = JSON.parse(readFileSync(new URL("../shared/abi/RiverRewards.json", import.meta.url), "utf8"));
  const encoded = encodeRewardClaim(proof, signer.rewardConfig);
  assert.equal(encoded, encodeFunctionData({ abi, functionName: "claim", args: [proof.message, proof.signature] }));
  assert.throws(() => encodeRewardClaim({ ...proof, message: { ...proof.message, rewardWei: "1" } }, signer.rewardConfig));
  assert.throws(() => encodeRewardClaim(proof, { ...signer.rewardConfig, contract: address }));
  assert.deepEqual(await signer.get(e.roundId, e.token), proof);
});
for (const fatal of ["capsized", "sunk"]) test(`${fatal}: persists collected mass but forfeits all payouts and rejects proof`, async t => {
  const { store, signer } = setup(t), e = evidence(store, { fatal });
  assert.equal(e.state.reason, fatal);
  assert.equal(e.state.rewardWei, "0");
  const row = store.evidence(e.roundId, e.playerId, tokenHash(e.token));
  assert.ok(row.weight_grams > 0);
  assert.equal(row.reward_wei, "0");
  assert.equal(row.reason, fatal);
  await assert.rejects(signer.sign(e, e.token), { code: "REWARD_FORFEITED" });
  assert.equal(store.nonce(address), 0);
  assert.equal(store.signed(e.roundId, e.playerId), null);
});
test("invented mass, inflated payout and reused item evidence cannot be signed", async t => {
  for (const column of ["weight_grams", "reward_wei", "pickup_json"]) {
    const { store, signer } = setup(t), e = evidence(store);
    const value = column === "pickup_json" ? "[0,0]" : column === "weight_grams" ? 15000 : "999999999999999999";
    // Column names above are a fixed test list, never user-supplied SQL.
    store.db.prepare(`UPDATE round_players SET ${column}=? WHERE round_id=? AND session_id=?`).run(value, e.roundId, e.playerId);
    await assert.rejects(signer.sign(e, e.token), { code: "IMPOSSIBLE_RESULT" });
  }
});
test("persistRound rejects two players owning the same pickup even when individual scores look valid", t => {
  const { store } = setup(t), e = evidence(store), s = structuredClone(e.state);
  const a = s.players[0], b = s.players[1];
  b.picked = [...a.picked]; b.trash = a.trash; b.weightGrams = a.weightGrams; b.score = a.score;
  s.picked = s.players.flatMap(p => p.picked);
  assert.throws(() => store.persistRound(s, []), /INVALID_TRASH_EVIDENCE/);
});
