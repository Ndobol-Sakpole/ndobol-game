import { createPublicClient, http, keccak256, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodeRewardClaim, matchesRewardReceipt } from "../../../shared/reward-claim.js";
import { ApiError } from "./index.js";

const fail = (status, code) => { throw new ApiError(status, code); };
const json = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "bigint" ? `0x${v.toString(16)}` : v));
// Same arguments as claim(), but submitted by a gas sponsor. Destination is fixed in the signed struct.
const selector = keccak256(new TextEncoder().encode("claimFor((bytes32,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256),bytes)")).slice(0, 10);

export function createSponsor(store, signer, {
  enabled = process.env.REWARD_SPONSOR_ENABLED === "true",
  privateKey = process.env.RELAYER_PRIVATE_KEY,
  client = createPublicClient({ transport: http(process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz", { timeout: 8000, retryCount: 0 }) }),
  account = privateKey ? privateKeyToAccount(privateKey) : null,
  maxGas = 220000n,
  maxGasPrice = BigInt(process.env.RELAYER_MAX_GAS_PRICE_WEI || "150000000000"),
  dailyBudget = parseEther(process.env.RELAYER_DAILY_BUDGET_MON || "0.1"),
  now = Date.now,
} = {}) {
  if (enabled && (!account || !signer.rewardConfig.enabled || signer.rewardConfig.chainId !== 10143))
    throw new Error("SPONSOR_REQUIRES_TESTNET_KEY_AND_ENABLED_POOL");
  if (maxGas <= 0n || maxGasPrice <= 0n || dailyBudget <= 0n) throw new Error("INVALID_SPONSOR_LIMITS");
  let queue = Promise.resolve();
  const attempts = new Map();
  function rate(player) {
    for (const [key, r] of attempts) if (r.until < now()) attempts.delete(key);
    const r = attempts.get(player) || { count: 0, until: now() + 60000 };
    if (!attempts.has(player) && attempts.size >= 4000) fail(429, "SPONSOR_RATE_LIMIT");
    attempts.set(player, r);
    if (++r.count > 40) fail(429, "SPONSOR_RATE_LIMIT");
  }
  const publicResult = record => ({ hash: record.hash, status: record.status, recipient: record.proof.message.player,
    rewardWei: record.proof.message.rewardWei, gasPayer: record.sender, playerGasWei: "0", receipt: record.receipt || null });
  async function reconcile(record) {
    if (record.status !== "pending") return record;
    let receipt;
    try { receipt = await client.getTransactionReceipt({ hash: record.hash }); }
    catch (error) {
      if (error.name !== "TransactionReceiptNotFoundError") fail(503, "SPONSOR_RPC_UNAVAILABLE");
    }
    if (receipt) {
      const normalized = { ...json(receipt), status: receipt.status === "success" ? "0x1" : "0x0" };
      if (receipt.transactionHash.toLowerCase() !== record.hash.toLowerCase() || !receipt.blockNumber)
        fail(503, "UNVERIFIED_REWARD_RECEIPT");
      if (receipt.status === "success" && !matchesRewardReceipt(record.proof, normalized, record.sender))
        fail(503, "UNVERIFIED_REWARD_RECEIPT");
      record = { ...record, status: receipt.status === "success" ? "confirmed" : "failed", receipt: normalized };
      await store.relayUpdate(record);
    } else {
      // Exact saved bytes/hash only. A timeout or restart never allocates a replacement nonce.
      try { await client.sendRawTransaction({ serializedTransaction: record.raw }); }
      catch { /* Already known or uncertain broadcast: keep pending and reconcile on the next poll. */ }
    }
    return record;
  }
  async function submit(proof) {
    const id = `${proof.domain.chainId}:${proof.domain.verifyingContract.toLowerCase()}:${proof.message.roundId}:${proof.message.player.toLowerCase()}`;
    const existing = await store.relayGet(id);
    if (existing) return publicResult(await reconcile(existing));
    if (!proof.claimEnabled) fail(403, "REWARD_NOT_ACTIVE");
    const data = selector + encodeRewardClaim(proof, signer.rewardConfig).slice(10);
    if (BigInt(proof.message.deadline) <= BigInt(Math.floor(now() / 1000))) fail(410, "REWARD_EXPIRED");
    if (await client.getChainId() !== 10143) fail(503, "SPONSOR_WRONG_CHAIN");
    // One dedicated sender, one API process. Do not advance a nonce while any previous broadcast is uncertain.
    for (const pending of await store.relayPending()) {
      if ((await reconcile(pending)).status === "pending") fail(503, "SPONSOR_BUSY");
    }
    const tx = { account: account.address, to: signer.rewardConfig.contract, data, value: 0n };
    let estimate;
    try { estimate = await client.estimateGas(tx); }
    catch { fail(422, "REWARD_PREFLIGHT_FAILED"); }
    const gas = estimate * 12n / 10n + 1000n;
    const gasPrice = await client.getGasPrice();
    if (gas > maxGas || gasPrice > maxGasPrice) fail(503, "SPONSOR_FEE_LIMIT");
    const maxFeeWei = gas * gasPrice;
    if (await client.getBalance({ address: account.address }) < maxFeeWei) fail(503, "SPONSOR_EMPTY");
    const nonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
    const raw = await account.signTransaction({ chainId: 10143, to: tx.to, data, value: 0n, gas, gasPrice, nonce, type: "legacy" });
    const record = { id, day: new Date(now()).toISOString().slice(0, 10), maxFeeWei: String(maxFeeWei),
      status: "pending", hash: keccak256(raw), raw, sender: account.address, proof };
    if (!await store.relayReserve(record, dailyBudget)) fail(503, "SPONSOR_DAILY_LIMIT");
    // Read back the durable record: an interrupted/retried DB write must never send a different transaction.
    return publicResult(await reconcile(await store.relayGet(id)));
  }
  return {
    enabled,
    address: enabled ? account.address : null,
    async claim(roundId, token) {
      if (!enabled) fail(503, "SPONSOR_DISABLED");
      // Request contains only a round identifier. Proof, recipient, amount and calldata come from trusted storage.
      const proof = await signer.get(roundId, token);
      rate(proof.message.player.toLowerCase());
      const work = queue.then(() => submit(proof));
      queue = work.catch(() => {});
      return work;
    },
  };
}
