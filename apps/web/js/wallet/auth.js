import { apiUrl } from "../net/config.js";
export function walletSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem("ndobol-wallet"));
    return s?.expiresAt > Date.now() && s.chainId === 10143 ? s : null;
  } catch { return null; }
}
export function clearWalletSession() {
  try { sessionStorage.removeItem("ndobol-wallet"); } catch { /* private browsing */ }
}
export async function authenticateWallet(provider = globalThis.ethereum) {
  if (!provider?.request) throw new Error("WALLET_REQUIRED");
  const [accounts, chain] = await Promise.all([
    provider.request({ method: "eth_accounts" }), provider.request({ method: "eth_chainId" }),
  ]);
  const address = accounts?.[0]?.toLowerCase();
  if (!address) throw new Error("WALLET_REQUIRED");
  if (Number(chain) !== 10143) throw new Error("WRONG_NETWORK");
  const cached = walletSession();
  if (cached?.address === address) return cached;
  clearWalletSession();
  async function post(path, body) {
    const response = await fetch(apiUrl(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AUTH_FAILED");
    return result;
  }
  const challenge = await post("/auth/challenge", { address });
  if (challenge.chainId !== 10143 || typeof challenge.message !== "string" || !challenge.message.includes(address)) throw new Error("INVALID_CHALLENGE");
  const hex = "0x" + [...new TextEncoder().encode(challenge.message)].map(v => v.toString(16).padStart(2,"0")).join("");
  const signature = await provider.request({ method: "personal_sign", params: [hex, address] });
  const result = await post("/auth/verify", { id: challenge.id, signature });
  // If the user switched accounts while the signature dialog was open, require a new login.
  const current = await provider.request({ method: "eth_accounts" });
  if (current[0]?.toLowerCase() !== address || Number(await provider.request({ method: "eth_chainId" })) !== 10143) throw new Error("WALLET_CHANGED");
  sessionStorage.setItem("ndobol-wallet", JSON.stringify(result));
  return result;
}
