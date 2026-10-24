import test from "node:test";
import assert from "node:assert/strict";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { parseTransaction, keccak256 } from "viem";
import { createSponsor } from "../services/api/signing/sponsor.js";
import { createStore } from "../data/store.js";
import { createSponsoredClaimClient } from "../apps/web/js/wallet/sponsored-claim.js";
import { REWARD_NAME, REWARD_VERSION } from "../shared/reward-signing.js";
import { REWARD_CLAIMED_TOPIC } from "../shared/reward-claim.js";

function setup(t, overrides = {}) {
  const store = createStore(); t.after(() => store.close());
  const account = privateKeyToAccount(generatePrivateKey());
  const player = "0x1111111111111111111111111111111111111111", pool = "0x2222222222222222222222222222222222222222";
  const proof = { roundId: "test-round", primaryType: "RoundReward", claimEnabled: true,
    domain: { name: REWARD_NAME, version: REWARD_VERSION, chainId: 10143, verifyingContract: pool },
    message: { roundId: "0x"+"01".repeat(32), trackId: "0x"+"02".repeat(32), player,
      score: "59", trash: "3", weightGrams: "59", rewardWei: "590000000000", nonce: "0", deadline: "2000000000" },
    signature: "0x"+"11".repeat(65) };
  const config = { enabled: true, chainId: 10143, contract: pool, sponsored: true, relayer: account.address };
  const signer = { rewardConfig: config, get: async (_id, token) => { if (token !== "owned") throw new Error("RESULT_NOT_OWNED"); return structuredClone(proof); } };
  let receipt = null;
  const sent = [];
  const client = {
    getChainId: async () => 10143,
    getBalance: async () => 10n ** 18n,
    getGasPrice: async () => 100000000000n,
    estimateGas: async () => 120000n,
    getTransactionCount: async () => 0,
    getTransactionReceipt: async () => { if (receipt) return receipt; throw Object.assign(new Error(), { name: "TransactionReceiptNotFoundError" }); },
    sendRawTransaction: async ({ serializedTransaction }) => { sent.push(serializedTransaction); return keccak256(serializedTransaction); },
  };
  const options = { enabled: true, account, client, now: () => 1800000000000, ...overrides };
  const sponsor = createSponsor(store, signer, options);
  function confirm(hash) {
    const m = proof.message;
    receipt = { status: "success", transactionHash: hash, blockNumber: 123n, from: account.address, to: pool,
      logs: [{ address: pool, topics: [REWARD_CLAIMED_TOPIC, m.roundId, "0x"+m.player.slice(2).padStart(64,"0")],
        data: "0x"+[m.weightGrams,m.rewardWei,m.nonce].map(v=>BigInt(v).toString(16).padStart(64,"0")).join("") }] };
  }
  return { store, account, signer, options, sponsor, proof, config, sent, client, confirm };
}
test("sponsored claim saves before broadcast, only pays the signed player, and resumes after restart", async t => {
  const f = setup(t);
  const first = await f.sponsor.claim(f.proof.roundId, "owned");
  assert.equal(first.status, "pending"); assert.equal(first.playerGasWei, "0");
  const stored = f.store.relayPending()[0];
  assert.equal(stored.hash, keccak256(f.sent[0]));
  const tx = parseTransaction(stored.raw);
  assert.equal(tx.to.toLowerCase(), f.config.contract); assert.equal(tx.value || 0n, 0n);
  assert.equal(tx.chainId, 10143); assert.notEqual(tx.data.slice(0,10), "0xa6603a85");
  const restarted = createSponsor(f.store, f.signer, f.options);
  const duplicates = await Promise.all([restarted.claim(f.proof.roundId,"owned"), restarted.claim(f.proof.roundId,"owned")]);
  assert.ok(duplicates.every(r => r.hash === first.hash));
  assert.equal(new Set(f.sent).size, 1);
  f.confirm(first.hash);
  assert.equal((await restarted.claim(f.proof.roundId,"owned")).status, "confirmed");
  const count = f.sent.length;
  await restarted.claim(f.proof.roundId,"owned"); assert.equal(f.sent.length, count);
});
test("unowned, expired, inactive and mainnet claims cannot spend sponsor gas", async t => {
  const f = setup(t);
  await assert.rejects(f.sponsor.claim("x","stolen"), /RESULT_NOT_OWNED/);
  f.proof.message.deadline = "1";
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "REWARD_EXPIRED" });
  f.proof.claimEnabled = false;
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "REWARD_NOT_ACTIVE" });
  assert.equal(f.sent.length,0);
  assert.throws(() => createSponsor(f.store, { rewardConfig: { ...f.config, chainId: 143 } }, f.options), /SPONSOR_REQUIRES_TESTNET/);
});
test("empty sponsor, high fees, failed preflight, and durable daily budget fail closed", async t => {
  const f = setup(t, { dailyBudget: 1n });
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "SPONSOR_DAILY_LIMIT" });
  f.client.getBalance = async () => 0n;
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "SPONSOR_EMPTY" });
  f.client.getGasPrice = async () => 200000000000n;
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "SPONSOR_FEE_LIMIT" });
  f.client.estimateGas = async () => { throw new Error("invalid signature / pool"); };
  await assert.rejects(f.sponsor.claim("x","owned"), { code: "REWARD_PREFLIGHT_FAILED" });
  assert.equal(f.sent.length,0); assert.equal(f.store.relayPending().length,0);
});
test("an uncertain broadcast blocks a different nonce and never fabricates paid status", async t => {
  const f = setup(t);
  f.client.sendRawTransaction = async () => { throw new Error("timeout after accepted"); };
  const first = await f.sponsor.claim("x","owned"); assert.equal(first.status,"pending");
  f.proof.message.roundId = "0x"+"03".repeat(32);
  await assert.rejects(f.sponsor.claim("y","owned"), { code: "SPONSOR_BUSY" });
  assert.equal(f.store.relayPending().length,1);
});
test("SQLite daily reservations survive terminal status and are atomic", t => {
  const f = setup(t);
  const record = { id:"a",day:"2026-10-24",maxFeeWei:"70",status:"pending" };
  assert.equal(f.store.relayReserve(record,100n),true);
  f.store.relayUpdate({...record,status:"confirmed"});
  assert.equal(f.store.relayReserve({...record,id:"b",maxFeeWei:"31"},100n),false);
  assert.equal(f.store.relayReserve({...record,id:"c",maxFeeWei:"30"},100n),true);
});
test("browser sponsored flow never requests a paid wallet transaction; verifies recipient, sender and receipt", async t => {
  const f = setup(t), methods = [];
  const browser = createSponsoredClaimClient({
    provider: { request: async ({method}) => { methods.push(method); if(method === "eth_chainId") return "0x279f"; if(method === "eth_accounts") return [f.proof.message.player]; throw new Error("Unexpected wallet mutation"); } },
    session: () => ({ token:"owned" }),
    fetcher: async (_url, request) => {
      assert.deepEqual(JSON.parse(request.body),{roundId:f.proof.roundId});
      const result = await f.sponsor.claim(f.proof.roundId,"owned");
      return { ok:true,json:async()=>result };
    },
  });
  const hash = await browser.submit(f.proof,f.config); f.confirm(hash);
  assert.equal((await browser.receipt(f.proof,f.config)).status,"confirmed");
  assert.ok(methods.every(m=>["eth_accounts","eth_chainId"].includes(m)));
});
