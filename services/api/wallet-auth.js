import { randomBytes } from "node:crypto";
import { verifyMessage } from "viem";
import { isAddress } from "../../shared/messages.js";
import { ApiError } from "./signing/index.js";
import { tokenHash } from "./session-token.js";
/** Single-use EIP-191 login challenge, bound to the allowed web origin and Monad Testnet.
 * Keys are ephemeral; a process restart requires a fresh login. Never authorizes a transfer.
 */
export function createWalletAuth({ now = Date.now, maxEntries = 4000 } = {}) {
  const challenges = new Map(), sessions = new Map(), attempts = new Map();
  const fail = (status, code) => { throw new ApiError(status, code); };
  function sweep() {
    for (const map of [challenges, sessions, attempts]) for (const [k, v] of map) if (v.expiresAt < now()) map.delete(k);
  }
  function rate(key) {
    sweep();
    const r = attempts.get(key) || { count: 0, expiresAt: now() + 60000 };
    if (attempts.size >= maxEntries && !attempts.has(key)) fail(429, "AUTH_RATE_LIMIT");
    attempts.set(key, r);
    if (++r.count > 60) fail(429, "AUTH_RATE_LIMIT");
  }
  return {
    challenge(address, origin, ip) {
      rate(`ip:${ip}`);
      if (!isAddress(address) || !origin) fail(400, "INVALID_WALLET");
      if (challenges.size >= maxEntries) fail(429, "AUTH_RATE_LIMIT");
      address = address.toLowerCase();
      const id = randomBytes(24).toString("hex"), expiresAt = now() + 120000;
      const message = `${new URL(origin).host} requests a wallet login to Ndobol Sesarengan.\n\nWallet: ${address}\nURI: ${origin}\nChain ID: 10143\nNonce: ${id}\nIssued At: ${new Date(now()).toISOString()}\nExpiration Time: ${new Date(expiresAt).toISOString()}\n\nSign in to create or join a room. No transaction, token approval, or transfer is authorized.`;
      challenges.set(id, { address, origin, message, expiresAt });
      return { id, message, expiresAt, chainId: 10143 };
    },
    async verify(id, signature, origin, ip) {
      rate(`verify:${ip}`);
      const challenge = challenges.get(id);
      challenges.delete(id); // consume before awaiting recovery; concurrent replay cannot win
      if (!challenge || challenge.expiresAt < now() || challenge.origin !== origin) fail(401, "INVALID_CHALLENGE");
      if (typeof signature !== "string" || !/^0x[\da-fA-F]{130}$/.test(signature) ||
          !await verifyMessage({ address: challenge.address, message: challenge.message, signature }).catch(() => false)) fail(401, "INVALID_SIGNATURE");
      if (sessions.size >= maxEntries) fail(429, "AUTH_RATE_LIMIT");
      const token = randomBytes(32).toString("hex"), expiresAt = now() + 6 * 60 * 60 * 1000;
      sessions.set(tokenHash(token), { address: challenge.address, origin, expiresAt });
      return { token, address: challenge.address, expiresAt, chainId: 10143 };
    },
    authenticate(token, origin) {
      sweep();
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
      const value = sessions.get(tokenHash(token));
      return value && value.origin === origin ? value.address : null;
    },
  };
}
