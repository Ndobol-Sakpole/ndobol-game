import { CHAINS } from "../../../../shared/chains.js";
/** EIP-1193 adapter. Explicit user clicks only; no signing, transaction or wallet SDK. */
export function createWallet({
  provider = globalThis.ethereum,
  onChange = () => {},
} = {}) {
  let state = {
      address: null,
      chainId: null,
      available: Boolean(provider?.request),
    },
    connected = false;
  const publish = () => onChange({ ...state });
  const accountsChanged = (accounts) => {
    if (!connected) return;
    state.address = accounts?.[0] || null;
    publish();
  };
  const chainChanged = (id) => {
    if (!connected) return;
    state.chainId = Number(id);
    publish();
  };
  const disconnected = () => {
    connected = false;
    state.address = null;
    state.chainId = null;
    publish();
  };
  provider?.on?.("accountsChanged", accountsChanged);
  provider?.on?.("chainChanged", chainChanged);
  provider?.on?.("disconnect", disconnected);
  return {
    get state() {
      return { ...state };
    },
    async connect() {
      if (!state.available) throw new Error("Wallet browser tidak tersedia");
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const chain = await provider.request({ method: "eth_chainId" });
      connected = true;
      state = {
        ...state,
        address: accounts[0] || null,
        chainId: Number(chain),
      };
      publish();
      return { ...state };
    },
    async testnet() {
      if (!connected) throw new Error("Connect terlebih dahulu");
      const chain = CHAINS.testnet,
        chainId = "0x" + chain.id.toString(16);
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (e) {
        if (e.code !== 4902) throw e;
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: [chain.rpc],
            },
          ],
        });
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      }
      state.chainId = Number(await provider.request({ method: "eth_chainId" }));
      publish();
    },
    disconnect: disconnected,
    dispose() {
      provider?.removeListener?.("accountsChanged", accountsChanged);
      provider?.removeListener?.("chainChanged", chainChanged);
      provider?.removeListener?.("disconnect", disconnected);
    },
  };
}
