import { apiUrl } from "../net/config.js";
import { createClaimClient } from "../wallet/claim.js";
import { formatMon } from "../../../../shared/game/rewards.js";
/** Claim state is separate from simulated reward estimates. Only a successful receipt says paid. */
export function createRewardUI() {
  const button = document.querySelector("#claim"), status = document.querySelector("#claim-status");
  const client = createClaimClient();
  let proof = null, config = null, busy = false, generation = 0, blocked = null;
  const errors = {
    WALLET_REQUIRED: "Buka game di browser dengan wallet EVM.",
    WRONG_NETWORK: "Pilih jaringan Monad yang sama dengan bukti reward di wallet.",
    WRONG_REWARD_WALLET: "Hubungkan wallet penerima yang digunakan pada ronde ini.",
    REWARD_EXPIRED: "Bukti sudah kedaluwarsa. Reward ini tidak dapat diklaim.",
    REWARD_NOT_DEPLOYED: "Kontrak hadiah belum tersedia pada jaringan ini.",
  };
  function render() {
    button.disabled = busy || !proof?.claimEnabled || !config?.enabled;
    button.textContent = blocked === "REWARD_FORFEITED" ? "Reward hangus" : blocked === "NO_REWARD" ? "Belum ada reward" : busy ? "Memeriksa wallet…" : proof?.claimEnabled && config?.enabled
      ? client.pending(proof) ? "Periksa transaksi klaim" : `Klaim ${formatMon(proof.message.rewardWei)} MON`
      : "Klaim MON · belum aktif";
  }
  fetch(apiUrl("/rewards/config")).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(value => {
    config = value; render();
  }).catch(() => { config = null; render(); });
  button.addEventListener("click", async () => {
    if (busy || !proof || !config?.enabled) return;
    const current = proof, ticket = generation;
    busy = true; render();
    try {
      const hash = await client.submit(current, config);
      if (ticket !== generation) return;
      status.textContent = `Transaksi dikirim: ${hash}. Menunggu konfirmasi; belum dihitung sebagai MON diterima.`;
      const receipt = await client.receipt(current);
      if (ticket !== generation) return;
      if (receipt?.status === "confirmed") {
        status.textContent = `${formatMon(current.message.rewardWei)} MON berhasil diklaim. Transaksi: ${hash}`;
        proof = { ...current, claimEnabled: false };
      } else if (receipt?.status === "failed") {
        client.retryFailed(current);
        status.textContent = "Transaksi gagal di jaringan; reward belum dibayar. Periksa saldo pool dan biaya gas sebelum mencoba lagi.";
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
      blocked = null;
      proof = value?.primaryType === "RoundReward" ? value : null;
      status.textContent = proof
        ? "Klaim mengirim MON dari pool pengelola ke wallet penerima; biaya gas dibayar melalui wallet."
        : "Reward di layar adalah perhitungan ronde, bukan saldo wallet. Klaim memerlukan ronde server dan bukti yang valid.";
      render();
    },
    block(code) { blocked = code; proof = null; render(); },
  };
}
