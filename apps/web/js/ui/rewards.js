import { apiUrl } from "../net/config.js";
import { createClaimClient } from "../wallet/claim.js";
import { formatMon } from "../../../../shared/game/rewards.js";
import { createSponsoredClaimClient } from "../wallet/sponsored-claim.js";
/** Claim state is separate from simulated reward estimates. Only a successful receipt says paid. */
export function createRewardUI() {
  const button = document.querySelector("#claim"), status = document.querySelector("#claim-status");
  const direct = createClaimClient(), sponsored = createSponsoredClaimClient();
  let client = direct;
  let proof = null, config = null, busy = false, generation = 0, blocked = null, paid = false;
  const errors = {
    WALLET_REQUIRED: "Buka game di browser dengan wallet EVM.",
    WRONG_NETWORK: "Pilih jaringan Monad yang sama dengan bukti reward di wallet.",
    WRONG_REWARD_WALLET: "Hubungkan wallet penerima yang digunakan pada ronde ini.",
    REWARD_EXPIRED: "Bukti sudah kedaluwarsa. Reward ini tidak dapat diklaim.",
    REWARD_NOT_DEPLOYED: "Kontrak hadiah belum tersedia pada jaringan ini.",
    SPONSOR_EMPTY: "Saldo gas pengelola habis. Pemain tidak ditagih; coba lagi setelah pengelola mengisinya.",
    SPONSOR_DAILY_LIMIT: "Batas subsidi gas hari ini tercapai. Pemain tidak ditagih.",
    SPONSOR_FEE_LIMIT: "Gas jaringan sedang melewati batas pengelola. Coba lagi nanti.",
    SPONSOR_BUSY: "Transaksi pengelola sebelumnya masih diproses. Tunggu sebentar lalu periksa lagi.",
    SPONSOR_RPC_UNAVAILABLE: "Jaringan belum merespons. Periksa lagi; transaksi tidak dikirim ulang dengan nonce baru.",
    SPONSOR_RATE_LIMIT: "Tunggu sebentar sebelum memeriksa transaksi lagi.",
    INVALID_SESSION: "Sesi ronde tidak tersedia. Buka hasil dari tab tempat Anda bermain.",
    REWARD_PREFLIGHT_FAILED: "Klaim belum dapat diproses. Pengelola perlu memeriksa pool dan bukti reward.",
  };
  function render() {
    button.disabled = paid || busy || !proof?.claimEnabled || !config?.enabled;
    button.textContent = paid ? config?.sponsored ? "Reward masuk · gas pemain 0" : "Reward masuk" : blocked === "REWARD_FORFEITED" ? "Reward hangus" : blocked === "NO_REWARD" ? "Belum ada reward" : busy ? "Memproses klaim…" : proof?.claimEnabled && config?.enabled
      ? client.pending(proof) ? "Periksa transaksi klaim" : `Klaim ${formatMon(proof.message.rewardWei)} MON${config.sponsored ? " · tanpa gas" : ""}`
      : "Klaim MON · belum aktif";
  }
  fetch(apiUrl("/rewards/config")).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(value => {
    config = value; client = config.sponsored ? sponsored : direct; render();
  }).catch(() => { config = null; render(); });
  button.addEventListener("click", async () => {
    if (busy || !proof || !config?.enabled) return;
    const current = proof, ticket = generation;
    busy = true; render();
    try {
      const hash = await client.submit(current, config);
      if (ticket !== generation) return;
      status.textContent = `Transaksi dikirim: ${hash}. Menunggu konfirmasi; belum dihitung sebagai MON diterima.`;
      let receipt = await client.receipt(current, config);
      for (let attempt = 0; receipt?.status === "pending" && attempt < 12 && ticket === generation; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (ticket !== generation) return;
        receipt = await client.receipt(current, config);
      }
      if (ticket !== generation) return;
      if (receipt?.status === "confirmed") {
        status.textContent = `${formatMon(current.message.rewardWei)} MON masuk ke wallet.${config.sponsored ? " Gas dibayar pengelola; biaya pemain 0 MON." : ""} `;
        const link = document.createElement("a");
        link.href = `https://testnet.monadscan.com/tx/${hash}`;
        link.textContent = "Lihat bukti transaksi"; link.target = "_blank"; link.rel = "noopener noreferrer";
        status.append(link);
        paid = true;
      } else if (receipt?.status === "failed") {
        client.retryFailed(current);
        status.textContent = config.sponsored ? "Transaksi pengelola gagal. Saldo pemain tidak dipotong; hubungi pengelola untuk pemeriksaan." : "Transaksi gagal di jaringan; reward belum dibayar.";
      }
    } catch (e) {
      if (ticket === generation) status.textContent = e.code === 4001
        ? "Klaim dibatalkan di wallet. Reward belum dikirim."
        : errors[e.message] || "Klaim belum berhasil. Periksa wallet, saldo pool, dan status transaksi. Transaksi yang sudah dikirim tidak dikirim ulang.";
    } finally {
      busy = false;
      render();
    }
  });
  render();
  return {
    show(value) {
      generation++;
      paid = false;
      blocked = null;
      proof = value?.primaryType === "RoundReward" ? value : null;
      status.textContent = proof
        ? config?.sponsored ? "Reward masuk penuh ke wallet Anda. Gas klaim dibayar pengelola; Anda tidak perlu mengirim transaksi atau memiliki MON untuk gas." : "Klaim mengirim MON dari pool pengelola ke wallet penerima; biaya gas dibayar melalui wallet."
        : "Reward di layar adalah perhitungan ronde, bukan saldo wallet. Klaim memerlukan ronde server dan bukti yang valid.";
      render();
    },
    block(code) { blocked = code; proof = null; render(); },
  };
}
