import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../apps/web/js/net/client.js";
import { createSession } from "../apps/web/js/game/session.js";
function browser(t, stored = null) {
  const previous = {
    WebSocket: globalThis.WebSocket,
    location: globalThis.location,
    sessionStorage: globalThis.sessionStorage,
  };
  class Socket {
    static OPEN = 1;
    static sockets = [];
    constructor() {
      this.readyState = 0;
      this.sent = [];
      Socket.sockets.push(this);
    }
    send(raw) {
      this.sent.push(JSON.parse(raw));
    }
    close() {
      this.readyState = 3;
    }
    open() {
      this.readyState = 1;
      this.onopen();
    }
    receive(type, payload) {
      this.onmessage({ data: JSON.stringify({ v: 4, type, payload }) });
    }
  }
  globalThis.WebSocket = Socket;
  globalThis.location = {
    href: "http://localhost:4174/apps/web/index.html",
    protocol: "http:",
  };
  globalThis.sessionStorage = {
    getItem: () => JSON.stringify(stored),
    setItem(_key, value) {
      stored = JSON.parse(value);
    },
  };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  return Socket;
}
test("stale socket close cannot reset a newly connected client", async (t) => {
  const Socket = browser(t),
    statuses = [],
    client = createClient({ onStatus: (s) => statuses.push(s) });
  t.after(() => client.close());
  const first = client.connect(),
    a = Socket.sockets[0];
  a.open();
  a.receive("welcome", { protocol: 4, serverTime: Date.now() });
  await first;
  client.close({ forget: true });
  const second = client.connect(),
    b = Socket.sockets[1];
  b.open();
  b.receive("welcome", { protocol: 4, serverTime: Date.now() });
  await second;
  a.onclose();
  assert.equal(statuses.at(-1), "connected");
  assert.equal(client.send("ready", { ready: true }), true);
  assert.equal(b.sent.at(-1).type, "ready");
});
test("resume sends sequence after last ack, predicts own gas and reconciles acknowledgement", async (t) => {
  const saved = {
      code: "ABC234",
      token: "a".repeat(64),
      playerId: "p1",
      slot: 1,
      lastSeq: 17,
    },
    Socket = browser(t, saved),
    events = [];
  const session = createSession({
    onState: () => {},
    onEvent: (e) => events.push(e),
    onStatus: () => {},
    onError: () => {},
  });
  t.after(() => session.leave());
  const restore = session.restore(),
    socket = Socket.sockets[0];
  socket.open();
  socket.receive("welcome", { protocol: 4, serverTime: Date.now() });
  await restore;
  socket.receive("joined", saved);
  const state = {
    roundId: "r1",
    trackId: "bengawan",
    tick: 20,
    phase: "running",
    elapsed: 1,
    s: 18,
    lateral: 0,
    speed: 2,
    turn: 0,
    bump: 0,
    beat: 1,
    eventId: 0,
    events: [],
    players: [{ id: "p1", slot: 1, lastSeq: 17, gas: 0 }],
  };
  const snapshot = (state) => ({
    roomCode: "ABC234",
    hostId: "p1",
    serverTime: Date.now(),
    state,
  });
  socket.receive("snapshot", snapshot(state));
  session.update(1 / 30, { fart: true, moveX: 0, moveZ: 0, turn: 0, reach: 0 });
  assert.equal(socket.sent.at(-1).payload.seq, 18);
  assert.ok(session.visual().players[0].gas > 0.8);
  assert.equal(events.at(-1).type, "predicted-fart");
  socket.receive(
    "snapshot",
    snapshot({
      ...state,
      tick: 21,
      players: [{ ...state.players[0], lastSeq: 18 }],
    }),
  );
  assert.equal(session.visual().players[0].gas, 0);
});

const { createWallet } = await import("../apps/web/js/wallet/client.js");
test("wallet connects only on request, handles chain/accounts and never requests a signature or transaction", async () => {
  const calls = [],
    handlers = new Map();
  let chain = "0x1";
  const provider = {
    on: (e, f) => handlers.set(e, f),
    removeListener: (e) => handlers.delete(e),
    async request(r) {
      calls.push(r.method);
      if (r.method === "eth_requestAccounts")
        return ["0x1111111111111111111111111111111111111111"];
      if (r.method === "eth_chainId") return chain;
      if (r.method === "wallet_switchEthereumChain") {
        chain = r.params[0].chainId;
        return null;
      }
      throw new Error("Unexpected method");
    },
  };
  const states = [],
    w = createWallet({ provider, onChange: (s) => states.push(s) });
  assert.deepEqual(calls, []);
  await w.connect();
  assert.equal(w.state.chainId, 1);
  await w.testnet();
  assert.equal(w.state.chainId, 10143);
  handlers.get("accountsChanged")([]);
  assert.equal(w.state.address, null);
  w.disconnect();
  handlers.get("accountsChanged")([
    "0x2222222222222222222222222222222222222222",
  ]);
  assert.equal(w.state.address, null);
  assert.ok(!calls.some((m) => /sign|sendTransaction/.test(m)));
  assert.ok(states.length >= 3);
  w.dispose();
  assert.equal(handlers.size, 0);
});
test("wallet missing provider and user rejection are recoverable without connecting", async () => {
  const missing = createWallet({ provider: null });
  assert.equal(missing.state.available, false);
  await assert.rejects(missing.connect());
  const rejected = createWallet({
    provider: {
      request: async () => {
        throw Object.assign(new Error("Rejected"), { code: 4001 });
      },
    },
  });
  await assert.rejects(rejected.connect(), (e) => e.code === 4001);
  assert.equal(rejected.state.address, null);
});

const { createClaimClient } = await import("../apps/web/js/wallet/claim.js");
const { REWARD_NAME, REWARD_VERSION } = await import("../shared/reward-signing.js");
function claimFixture() {
  const address = "0x1111111111111111111111111111111111111111", contract = "0x2222222222222222222222222222222222222222";
  const proof = { claimEnabled: true, primaryType: "RoundReward", domain: { name: REWARD_NAME, version: REWARD_VERSION, chainId: 10143, verifyingContract: contract },
    message: { roundId: "0x" + "01".repeat(32), player: address, trackId: "0x" + "02".repeat(32), score: "1000", trash: "20", weightGrams: "1000", rewardWei: "10000000000000", nonce: "0", deadline: "2000000000" }, signature: "0x" + "11".repeat(65) };
  const calls = [], storageMap = new Map(), hash = "0x" + "ab".repeat(32);
  const storage = { getItem: k => storageMap.get(k), setItem: (k,v) => storageMap.set(k,v), removeItem: k => storageMap.delete(k) };
  const responses = { eth_chainId: "0x279f", eth_accounts: [address], eth_getCode: "0x6001", eth_call: "0x", eth_sendTransaction: hash, eth_getTransactionReceipt: null };
  const provider = { async request(r) { calls.push(r); if (responses[r.method] instanceof Error) throw responses[r.method]; return responses[r.method]; } };
  const config = { enabled: true, chainId: 10143, contract };
  return { proof, calls, provider, storage, responses, config, hash };
}
test("claim requires matching wallet/network and preflight, sends zero MON, and persists a pending hash", async () => {
  const f = claimFixture(), client = createClaimClient(f);
  assert.equal(f.calls.length, 0);
  f.responses.eth_chainId = "0x1";
  await assert.rejects(client.submit(f.proof, f.config), /WRONG_NETWORK/);
  f.responses.eth_chainId = "0x279f"; f.responses.eth_accounts = [];
  await assert.rejects(client.submit(f.proof, f.config), /WRONG_REWARD_WALLET/);
  f.responses.eth_accounts = [f.proof.message.player];
  f.responses.eth_call = new Error("empty pool");
  await assert.rejects(client.submit(f.proof, f.config), /empty pool/);
  assert.ok(!f.calls.some(c => c.method === "eth_sendTransaction"));
  f.responses.eth_call = "0x";
  assert.equal(await client.submit(f.proof, f.config), f.hash);
  const tx = f.calls.find(c => c.method === "eth_sendTransaction").params[0];
  assert.equal(tx.value, "0x0"); assert.equal(tx.to, f.config.contract);
  assert.ok(tx.data.startsWith("0xa6603a85"));
  assert.equal((await client.receipt(f.proof)).status, "pending");
  const resumed = createClaimClient(f);
  await resumed.submit(f.proof, f.config);
  assert.equal(f.calls.filter(c => c.method === "eth_sendTransaction").length, 1);
  f.responses.eth_getTransactionReceipt = {};
  await assert.rejects(resumed.receipt(f.proof), /UNVERIFIED_REWARD_RECEIPT/);
  assert.equal(resumed.pending(f.proof), f.hash);
  f.responses.eth_getTransactionReceipt = { status: "0x0", blockNumber: "0x1", transactionHash: f.hash };
  assert.equal((await resumed.receipt(f.proof)).status, "failed");
  resumed.retryFailed(f.proof);
  assert.equal(resumed.pending(f.proof), null);
});
test("claim rejection or expired proof cannot be shown as paid", async () => {
  const f = claimFixture(), client = createClaimClient({ ...f, now: () => 2100000000000 });
  await assert.rejects(client.submit(f.proof, f.config), /REWARD_EXPIRED/);
  assert.equal(f.calls.length, 0);
  f.responses.eth_sendTransaction = Object.assign(new Error("cancelled"), { code: 4001 });
  const normal = createClaimClient(f);
  await assert.rejects(normal.submit(f.proof, f.config), { code: 4001 });
  assert.equal(normal.pending(f.proof), null);
});
test("paid status requires the pool's matching RewardClaimed log, not just an arbitrary successful hash", async () => {
  const f = claimFixture(), client = createClaimClient(f);
  await client.submit(f.proof, f.config);
  f.responses.eth_getTransactionReceipt = { status: "0x1", blockNumber: "0x1", transactionHash: f.hash, to: f.config.contract, from: f.proof.message.player, logs: [] };
  await assert.rejects(client.receipt(f.proof), /UNVERIFIED_REWARD_RECEIPT/);
  const { REWARD_CLAIMED_TOPIC } = await import("../shared/reward-claim.js");
  const m = f.proof.message;
  f.responses.eth_getTransactionReceipt.logs = [{ address: f.config.contract,
    topics: [REWARD_CLAIMED_TOPIC, m.roundId, "0x" + m.player.slice(2).padStart(64, "0")],
    data: "0x" + [m.weightGrams,m.rewardWei,m.nonce].map(v=>BigInt(v).toString(16).padStart(64,"0")).join("") }];
  assert.equal((await client.receipt(f.proof)).status, "confirmed");
});
