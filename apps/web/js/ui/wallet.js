import { authenticateWallet, walletSession, clearWalletSession } from "../wallet/auth.js";
import { createWallet } from "../wallet/client.js";
export function createWalletUI({ locked, onAddress, onIdentity = () => {} }) {
  const $ = (id) => document.getElementById(id),
    dialog = $("wallet-dialog");
  let pending = false,
    deferredAddress;
  const wallet = createWallet({
    onChange(state) {
      const auth = walletSession();
      if (auth && (auth.address !== state.address?.toLowerCase() || state.chainId !== 10143)) clearWalletSession();
      render(state);
      onIdentity(state);
      if (!locked()) {
        onAddress(state.address);
        deferredAddress = undefined;
      } else deferredAddress = state.address;
    },
  });
  function render(s) {
    $("wallet-label").textContent = s.address
      ? `${s.address.slice(0, 6)}…${s.address.slice(-4)}`
      : "Connect wallet";
    $("wallet-account").textContent = s.address || "Wallet wajib · belum terhubung";
    $("wallet-network").textContent =
      s.chainId === 10143
        ? "Monad Testnet · 10143"
        : s.chainId === 143
          ? "Monad Mainnet · 143"
          : s.chainId
            ? `Jaringan lain · ${s.chainId}`
            : "—";
    $("wallet-connect").hidden = Boolean(s.address);
    $("wallet-disconnect").hidden = !s.address;
    $("wallet-switch").hidden = !s.address || s.chainId === 10143;
    $("wallet-status").textContent = !s.available
      ? "Wallet browser belum tersedia. Buka melalui browser dengan wallet EVM; hubungkan wallet untuk membuat atau bergabung ke room."
      : s.address
        ? locked()
          ? "Wallet terhubung. Mengganti akun atau jaringan akan mengeluarkan Anda dari room."
          : "Alamat ini menjadi penerima reward. Klaim tersedia di hasil ronde jika pool telah diaktifkan."
        : "Connect wallet, pilih Monad Testnet, lalu tanda tangani pesan login untuk mulai. Login tidak memindahkan MON.";
    $("wallet-connect").disabled = pending || !s.available;
    $("wallet-switch").disabled = pending;
  }
  async function request(fn) {
    if (pending) return;
    pending = true;
    render(wallet.state);
    try {
      await fn();
    } catch (e) {
      $("wallet-status").textContent =
        e.code === 4001
          ? "Permintaan dibatalkan. Hubungkan wallet untuk mulai bermain."
          : "Koneksi belum berhasil. Periksa wallet lalu coba kembali.";
    } finally {
      pending = false;
      $("wallet-connect").disabled = !wallet.state.available;
      $("wallet-switch").disabled = false;
    }
  }
  $("wallet-open").addEventListener("click", () => {
    render(wallet.state);
    dialog.showModal();
  });
  $("wallet-close").addEventListener("click", () => dialog.close());
  $("wallet-connect").addEventListener("click", () =>
    request(() => wallet.connect()),
  );
  $("wallet-switch").addEventListener("click", () =>
    request(() => wallet.testnet()),
  );
  $("wallet-disconnect").addEventListener("click", () => wallet.disconnect());
  render(wallet.state);
  return {
    async ensure() {
      dialog.showModal();
      if (!wallet.state.address) await wallet.connect();
      if (wallet.state.chainId !== 10143) await wallet.testnet();
      $("wallet-status").textContent = "Konfirmasi pesan login di wallet. Tidak ada biaya gas untuk login.";
      try {
        const auth = await authenticateWallet();
        onAddress(auth.address);
        dialog.close();
        return auth;
      } catch (error) {
        $("wallet-status").textContent = error.code === 4001 ? "Login dibatalkan. Coba START GAME lagi jika siap." : "Login belum berhasil. Periksa server, wallet, dan jaringan testnet.";
        throw error;
      }
    },
    syncAddress() {
      if (deferredAddress !== undefined && !locked()) {
        onAddress(deferredAddress);
        deferredAddress = undefined;
      }
    },
    dispose: () => wallet.dispose(),
  };
}
