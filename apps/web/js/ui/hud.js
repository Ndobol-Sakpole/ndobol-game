import { formatMon, formatKg, isFatal } from "../../../../shared/game/rewards.js";
import { createRewardUI } from "./rewards.js";
import { RAFTS, DEFAULT_RAFT } from "../../../../shared/game/rafts.js";
import { ANIMALS, GAME, TRACK_RULES } from "../../../../shared/game/config.js";
import { isAddress, isRoomCode } from "../../../../shared/messages.js";
const $ = (s) => document.querySelector(s);
const text = (id, value) => {
  $(id).textContent = value;
};
const dictionary = {
  id: {
    garage: "PILIH GETEKMU",
    freePrototype: "1 kg = 0,00001 MON · semua getek bisa diuji",
    livePreview: "PRATINJAU 3D LANGSUNG",
    journey: "PERJALANAN",
    balance: "KESEIMBANGAN",
    direction: "ARAH GAS",
    puncture: "PSSST! Ban pecah. Pindah ke sisi yang masih mengapung.",
    bottles: "Ikatan botol lepas! Getek kehilangan daya apung.",
    dent: "Drum penyok! Hambatan air bertambah.",
    eyebrow: "SATU GETEK · EMPAT BIANG KEROK",
    title: "Pilih perjalananmu.",
    intro: "Jaga keseimbangan, arahkan kentut, dan bersihkan sungai bersama.",
    name: "Nama pemain",
    address: "Wallet penerima terverifikasi",
    guest:
      "Wallet wajib. Alamat dikunci selama ronde; reward test MON hanya untuk hasil server.",
    companion: "Kawan perjalanan",
    create: "Buat room",
    solo: "Main sendiri",
    join: "Gabung",
    room: "Kode room",
    ready: "Siap",
    unready: "Batal siap",
    start: "Mulai",
    leave: "Keluar room",
    botNote: "Slot kosong diisi bot saat mulai. Semua pemain harus siap.",
    language: "Bahasa",
    sound: "Suara aksi",
    note: "Dirakit dari bambu.<br>Dirawat bersama.",
    score: "POIN BERAT",
    weight: "BERAT",
    reward: "REWARD MON",
    capsized: "Getek terbalik",
    sunk: "Getek tenggelam",
    defeated: "Kru gugur.",
    forfeited: "Reward ronde hangus. Coba jaga keseimbangan pada perjalanan berikutnya.",
    danger: "⚠ Hampir terbalik! Pindah berat ke sisi berlawanan.",
    sinking: "⚠ Kehilangan daya apung! Getek mulai tenggelam.",
    trash: "SAMPAH",
    time: "SISA WAKTU",
    sync: "KEKOMPAKAN",
    together: "BERSIAP MENGALIR",
    roundEnd: "PERJALANAN SELESAI",
    thanks: "Sungai berterima kasih.",
    personalScore: "Skor",
    proof: "Lihat bukti hasil",
    claim: "Klaim MON",
    again: "Main lagi",
    lobby: "Lobi",
    leaderboard: "10 skor terbaik sungai ini",
    fart: "TAHAN · GAS",
    host: "Host",
    you: "Anda",
    bot: "Bot",
    verified: "Wallet terverifikasi · pilih room",
    connected: "Terhubung",
    reconnecting:
      "Koneksi terputus. Menghubungkan ulang; bot menjaga posisi Anda…",
    resuming: "Mengembalikan posisi kru…",
    expired: "Sesi berakhir. Kembali ke lobi untuk bergabung lagi.",
    offline: "Hubungkan wallet · lalu buat atau gabung room",
    local: "Demo lokal · hasil tidak ditandatangani",
    notReady: "Belum siap",
    away: "Terputus · bot",
    finish: "Garis akhir tercapai",
    timeout: "Waktu selesai",
    saved: "Hasil tersimpan",
    signing: "Menyiapkan bukti hasil…",
    guestResult: "Menunggu hasil ronde yang valid.",
    signed: "Bukti EIP-712 siap. Klaim aktif setelah kontrak dikonfigurasi dan didanai.",
    waitingHost: "Menunggu host memulai ulang",
    emptyBoard: "Belum ada hasil pada sungai ini.",
    unavailableBoard: "Papan skor belum tersedia.",
    invalidProfile:
      "Isi nama lalu hubungkan dan verifikasi wallet.",
    invalidCode: "Kode room terdiri dari 6 huruf/angka.",
    collision: "Rintangan! Pindah posisi untuk menyeimbangkan getek.",
    collected: "Sampah terangkat",
    loading: "Menyiapkan sungai…",
  },
  en: {
    garage: "CHOOSE YOUR RAFT",
    freePrototype: "1 kg = 0.00001 MON · all rafts can be tested",
    livePreview: "LIVE 3D PREVIEW",
    journey: "JOURNEY",
    balance: "BALANCE",
    direction: "THRUST",
    puncture: "POP! Tyre punctured. Move towards the supported side.",
    bottles: "Bottles came loose! Buoyancy reduced.",
    dent: "Dented drum! Water drag increased.",
    eyebrow: "ONE RAFT · FOUR TROUBLEMAKERS",
    title: "Choose your journey.",
    intro: "Walk, balance, aim your farts, and clean the river together.",
    name: "Player name",
    address: "Verified reward wallet",
    guest:
      "Wallet required. Locked during the round; only server results earn test MON.",
    companion: "River companion",
    create: "Create room",
    solo: "Play solo",
    join: "Join",
    room: "Room code",
    ready: "Ready",
    unready: "Not ready",
    start: "Start",
    leave: "Leave room",
    botNote: "Bots fill empty slots at the start. Every player must be ready.",
    language: "Language",
    sound: "Action sounds",
    note: "Made of bamboo.<br>Cared for together.",
    score: "WEIGHT POINTS",
    weight: "WEIGHT",
    reward: "MON REWARD",
    capsized: "Raft capsized",
    sunk: "Raft sank",
    defeated: "Crew lost.",
    forfeited: "This round’s reward is lost. Keep your balance on the next trip.",
    danger: "⚠ Tipping! Move your weight to the opposite side.",
    sinking: "⚠ Losing buoyancy! The raft is sinking.",
    trash: "LITTER",
    time: "TIME LEFT",
    sync: "SYNCHRONY",
    together: "GET READY TO FLOW",
    roundEnd: "JOURNEY COMPLETE",
    thanks: "The river thanks you.",
    personalScore: "Score",
    proof: "View result proof",
    claim: "Claim MON",
    again: "Play again",
    lobby: "Lobby",
    leaderboard: "Top 10 on this river",
    fart: "HOLD · GAS",
    host: "Host",
    you: "You",
    bot: "Bot",
    verified: "Wallet verified · choose a room",
    connected: "Connected",
    reconnecting: "Disconnected. Reconnecting; a bot is holding your place…",
    resuming: "Restoring your crew position…",
    expired: "Session expired. Return to the lobby to join again.",
    offline: "Connect wallet · create or join a room",
    local: "Local demo · results are not signed",
    notReady: "Not ready",
    away: "Offline · bot",
    finish: "Finish line reached",
    timeout: "Time is up",
    saved: "Results saved",
    signing: "Preparing result proof…",
    guestResult: "Waiting for a valid round result.",
    signed: "EIP-712 proof ready. Claims require a configured and funded pool.",
    waitingHost: "Waiting for host to play again",
    emptyBoard: "No results on this river yet.",
    unavailableBoard: "Leaderboard unavailable.",
    invalidProfile:
      "Enter a name, then connect and verify your wallet.",
    invalidCode: "Room codes contain 6 letters/numbers.",
    collision: "Obstacle! Move across the deck to balance the raft.",
    collected: "One piece of litter lifted. Thank you!",
    loading: "Preparing the river…",
  },
};
const errorCopy = {
  WALLET_REQUIRED: ["Hubungkan dan verifikasi wallet sebelum masuk room.", "Connect and verify your wallet before joining."],
  WRONG_NETWORK: ["Gunakan Monad Testnet.", "Switch to Monad Testnet."],
  WALLET_MISMATCH: ["Wallet berbeda dari identitas ronde.", "Wallet does not match the round identity."],
  NOT_READY: ["Semua pemain harus siap.", "All players must be ready."],
  ROOM_NOT_FOUND: ["Room tidak ditemukan.", "Room not found."],
  ROOM_FULL: [
    "Room sudah berisi empat pemain.",
    "Room already has four players.",
  ],
  ROUND_STARTED: ["Ronde sudah dimulai.", "Round already started."],
  SERVER_UNAVAILABLE: [
    "Server belum tersedia. Coba lagi setelah API terhubung.",
    "Server unavailable. Reconnect when the API is ready.",
  ],
  REWARD_FORFEITED: ["Reward hangus karena kru gugur.", "Reward forfeited: crew lost."],
  NO_REWARD: ["Belum ada berat sampah untuk diklaim.", "No collected weight to claim."],
  SIGNING_DISABLED: [
    "Hasil tersimpan; layanan reward belum siap. Pengelola perlu menyiapkan kontrak pool dan konfigurasi penandatanganan.",
    "Result saved; rewards are not ready. The operator must configure the pool contract and result signing.",
  ],
  ADDRESS_IN_ROOM: [
    "Alamat ini sudah digunakan dalam room.",
    "This address is already in the room.",
  ],
};
export function createUI(bus) {
  const rewards = createRewardUI();
  let lang = "id",
    state = null,
    meta = {},
    timer,
    rowsKey = "",
    resultsKey = "",
    connection = "offline",
    proofStatus = "guestResult",
    ready = false,
    raftId = DEFAULT_RAFT,
    trackLength = 1,
    entered = false;
  const t = (key) => dictionary[lang][key] || key;
  function translate() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((e) => {
      e.innerHTML = t(e.dataset.i18n);
    });
    for (const option of $("#animal-select").options)
      option.textContent = ANIMALS[option.value].name[lang];
    ability();
    renderRaft();
    rowsKey = "";
    resultsKey = "";
    text("#connection", t(connection));
    text("#sign-status", t(proofStatus));
    if (state) update(state, meta);
  }
  function ability() {
    text("#ability", ANIMALS[$("#animal-select").value].ability[lang]);
  }
  function profile() {
    const name = $("#player-name").value.trim(),
      address = $("#player-address").value.trim();
    if (!name || !isAddress(address)) {
      toast(t("invalidProfile"));
      return null;
    }
    return {
      name,
      animal: $("#animal-select").value,
      address: address || null,
      raftId,
      bots: $("#solo-bots").checked,
    };
  }
  function toast(value) {
    clearTimeout(timer);
    text("#toast", value);
    $("#toast").hidden = false;
    timer = setTimeout(() => ($("#toast").hidden = true), 3000);
  }
  for (const type of ["create", "join", "play"])
    $("#" + type).addEventListener("click", () => {
      const p = profile();
      if (!p) return;
      if (type !== "play") delete p.bots;
      if (type === "join") {
        delete p.raftId;
        p.code = $("#room-code").value.trim().toUpperCase();
        if (!isRoomCode(p.code)) {
          toast(t("invalidCode"));
          return;
        }
      }
      bus.emit(type, p);
    });
  $("#enter-game").addEventListener("click", () => {
    bus.emit("enter");
  });
  for (const id of ["back", "leave-room", "result-leave"])
    $("#" + id).addEventListener("click", () => bus.emit("lobby"));
  $("#ready").addEventListener("click", () =>
    bus.emit(
      "ready",
      !state?.players.find((p) => p.id === meta.playerId)?.ready,
    ),
  );
  $("#start").addEventListener("click", () => bus.emit("start"));
  $("#again").addEventListener("click", () => bus.emit("again"));
  $("#animal-select").addEventListener("change", () => {
    ability();
    bus.emit("animal", $("#animal-select").value);
  });
  $("#language").addEventListener("change", () => {
    lang = $("#language").value;
    translate();
  });
  for (const id of ["#sound", "#action-sound"])
    $(id).addEventListener("change", () => {
      const enabled = $(id).checked;
      $("#sound").checked = enabled;
      $("#action-sound").checked = enabled;
      bus.emit("sound", enabled);
    });
  document
    .querySelectorAll("[data-track]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        bus.emit("track", button.dataset.track),
      ),
    );
  function update(next, info = {}) {
    state = next;
    meta = info;
    const phase = state?.phase || "lobby",
      inRoom = Boolean(meta.online && state),
      running = phase === "running",
      results = phase === "results",
      self = state?.players.find((p) => p.id === meta.playerId),
      isHost = meta.hostId === meta.playerId;
    if (state) entered = true;
    document.body.classList.toggle("welcome", !entered);
    $("#title-screen").hidden = entered;
    $("#lobby").hidden = !entered || phase !== "lobby";
    $("#raft-dock").hidden = !entered || phase !== "lobby" || inRoom;
    $("#raft-caption").hidden = !entered || phase !== "lobby";
    $("#boat-telemetry").hidden = !["running", "countdown"].includes(phase);
    if (state && state.raftId !== raftId) {
      raftId = state.raftId;
      renderRaft();
    }
    $("#entry-fields").hidden = inRoom;
    $(".bot-option").hidden = true;
    $("#entry-actions").hidden = inRoom;
    $("#room-panel").hidden = !inRoom;
    $("#hud").hidden = !["countdown", "running", "finished"].includes(phase);
    $("#touch-controls").hidden = !running;
    $("#free-gas").hidden = !running;
    $("#results").hidden = !results;
    const fatal = isFatal(state?.reason);
    $("#death-banner").hidden = !(phase === "finished" && fatal);
    text("#death-reason", fatal ? t(state.reason) : "");
    $("#results").classList.toggle("defeat", fatal);
    const warning = running && (state.sinkTime > 0.2 ? "sinking" : Math.max(Math.abs(state.roll), Math.abs(state.pitch)) > GAME.floodAngle ? "danger" : null);
    $("#hull-warning").hidden = !warning;
    text("#hull-warning", warning ? t(warning) : "");
    $("#countdown").hidden = phase !== "countdown";
    document.body.classList.toggle("playing", phase !== "lobby");
    $("#track-select").disabled = inRoom || phase !== "lobby";
    $("#animal-select").disabled = phase !== "lobby";
    if (inRoom) {
      if (self && $("#animal-select").value !== self.animal) {
        $("#animal-select").value = self.animal;
        ability();
      }
      text("#room-label", meta.roomCode);
      text("#ready", t(self?.ready ? "unready" : "ready"));
      $("#ready").setAttribute("aria-pressed", String(Boolean(self?.ready)));
      $("#start").hidden = !isHost;
      $("#start").disabled = state.players.some(
        (p) => !p.ready || !p.connected,
      );
    }
    if (!state) return;
    const key =
      JSON.stringify(
        state.players.map((p) => [
          p.id,
          p.name,
          p.animal,
          p.ready,
          p.connected,
          p.bot,
        ]),
      ) +
      meta.hostId +
      lang;
    if (key !== rowsKey) {
      rowsKey = key;
      $("#room-players").replaceChildren(
        ...state.players.map((p) => {
          const li = document.createElement("li"),
            name = document.createElement("span"),
            status = document.createElement("strong");
          name.textContent = `${p.slot + 1}. ${p.name}${p.id === meta.playerId ? " · " + t("you") : ""} · ${ANIMALS[p.animal].name[lang]}`;
          status.textContent = [
            p.id === meta.hostId ? t("host") : "",
            p.connected
              ? p.ready
                ? "✓ " + t("ready")
                : t("notReady")
              : t("away"),
          ]
            .filter(Boolean)
            .join(" · ");
          li.append(name, status);
          return li;
        }),
      );
    }
    const balance = Math.round((state.balance ?? 1) * 100),
      hull = RAFTS[state.raftId];
    text("#balance-text", `${balance}%`);
    $("#balance-dot").style.left = `${Math.max(5, Math.min(95, 50 + ((state.roll || 0) / GAME.capsizeAngle) * 45))}%`;
    text(
      "#hull-status",
      `${hull.name} · ${Math.round(Math.hypot(state.speed, state.lateralVelocity || 0) * 3.6)} km/h · ${state.raftId === "ranjang-hanyut" ? `${Math.round(state.wetness * 100)}% ${lang === "id" ? "kasur basah" : "soaked mattress"}` : `${state.floats?.filter((f) => f < 1).length || 0}/4 ${lang === "id" ? "pelampung rusak" : "damaged floats"}`}`,
    );
    const selfAngle = (((self?.facing || 0) * 180) / Math.PI + 360) % 360;
    $("#direction-arrow").style.transform = `rotate(${selfAngle}deg)`;
    text("#direction-degrees", `${Math.round(selfAngle)}°`);
    const progress = Math.max(
      0,
      Math.min(
        1,
        (state.s - GAME.startDistance) /
          (trackLength - GAME.finishMargin - GAME.startDistance),
      ),
    );
    $("#journey-progress").value = progress;
    text("#distance-label", `${Math.round(progress * 100)}%`);
    text("#score", String(state.score).padStart(4, "0"));
    text("#collected", `${formatKg(state.weightGrams || 0)} kg`);
    text("#trash-count", `${state.collected} ${lang === "id" ? "benda" : "items"}`);
    text("#reward-estimate", `${formatMon(self?.rewardWei || "0")} MON`);
    const seconds = Math.max(0, Math.ceil(state.limitSeconds - state.elapsed));
    text(
      "#time",
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    );
    text(
      "#current-label",
      state.rapid > 0.1
        ? `${state.current.toFixed(1)} m/s · JERAM`
        : lang === "id"
          ? "TENANG"
          : "CALM",
    );
    text(
      "#countdown-number",
      Math.max(1, Math.ceil(GAME.countdownSeconds - state.phaseTime)),
    );
    text("#culture", TRACK_RULES[state.trackId].culture[lang]);
    text(
      "#crew-status",
      state.players
        .map(
          (p) =>
            `${p.slot + 1} ${p.id === meta.playerId ? t("you") : p.name}${p.bot ? " · " + t("bot") : !p.connected ? " · " + t("away") : ""}`,
        )
        .join(" / "),
    );
    if (results) {
      const resultKey = state.roundId + lang;
      if (resultsKey !== resultKey) {
        resultsKey = resultKey;
        $("#result-players").replaceChildren(
          ...state.players.map((p) => {
            const row = document.createElement("tr");
            for (const value of [
              p.name + (p.bot ? " · " + t("bot") : ""),
              `${formatKg(p.weightGrams || 0)} kg · ${p.trash}`,
              p.score,
              p.bot ? "—" : formatMon(p.rewardWei || "0"),
            ]) {
              const cell = document.createElement("td");
              cell.textContent = value;
              row.append(cell);
            }
            return row;
          }),
        );
      }
      text("#result-title", t(fatal ? "defeated" : "thanks"));
      text("#result-reward", fatal ? t("forfeited") :
        `${formatKg(self?.weightGrams || 0)} kg × 0.00001 MON/kg = ${formatMon(self?.rewardWei || "0")} MON${meta.online ? "" : " · DEMO"}`);
      text(
        "#result-summary",
        `${t(state.reason || "timeout")} · ${state.collected} ${t("trash").toLowerCase()} · ${Math.round(state.elapsed)}s`,
      );
      $("#again").disabled = meta.online && !isHost;
      text("#again", meta.online && !isHost ? t("waitingHost") : t("again"));
    }
  }
  function renderRaft() {
    const selected = RAFTS[raftId];
    text("#raft-name", selected.name);
    text("#raft-description", selected.description[lang]);
    text(
      "#raft-price",
      selected.priceWei !== "0"
        ? `${formatMon(selected.priceWei)} MON · ${Number(BigInt(selected.priceWei) / 10000000000000n)} kg`
        : lang === "id"
          ? "Gratis · getek awal"
          : "Free · starter raft",
    );
    $("#raft-cards").replaceChildren(
      ...Object.entries(RAFTS).map(([id, raft], i) => {
        const b = document.createElement("button");
        b.className = "raft-card";
        b.dataset.raft = id;
        b.setAttribute("aria-pressed", String(id === raftId));
        const icon = document.createElement("span");
        icon.className = "raft-icon raft-" + i;
        icon.setAttribute("aria-hidden", "true");
        for (let j = 0; j < 5; j++) {
          const pole = document.createElement("i");
          icon.append(pole);
        }
        const name = document.createElement("strong"),
          price = document.createElement("small");
        name.textContent = raft.name;
        price.textContent = raft.priceWei !== "0"
          ? `${formatMon(raft.priceWei)} MON`
          : lang === "id"
            ? "GRATIS"
            : "FREE";
        b.append(icon, name, price);
        b.addEventListener("click", () => {
          if (state) return;
          raftId = id;
          renderRaft();
          bus.emit("raft", id);
        });
        return b;
      }),
    );
    const chosen = document.querySelector(`[data-raft="${raftId}"]`);
    if (chosen)
      $("#raft-cards").scrollLeft = Math.max(
        0,
        chosen.offsetLeft -
          $("#raft-cards").clientWidth / 2 +
          chosen.clientWidth / 2,
      );
  }
  translate();
  return {
    enter() { entered = true; update(state, meta); $("#create").focus(); },
    t,
    profile,
    toast,
    update,
    setReady(value) {
      ready = value;
      for (const id of ["create", "join", "play", "enter-game"])
        $("#" + id).disabled = !ready;
    },
    setTrack(track) {
      trackLength = track.length;
      text("#location-name", track.name);
      text("#location-region", track.region);
      $("#track-select").value = track.id;
      document.querySelectorAll("[data-track]").forEach((b) => {
        b.classList.toggle("active", b.dataset.track === track.id);
        b.setAttribute("aria-pressed", String(b.dataset.track === track.id));
      });
    },
    setStatus(value) {
      connection = value;
      text("#connection", t(value));
      if (["reconnecting", "expired"].includes(value)) toast(t(value));
    },
    proof(value, status = "guestResult") {
      rewards.show(value);
      proofStatus = status;
      text("#sign-status", t(status));
      $("#signature-details").hidden = !value;
      text("#signature-payload", value ? JSON.stringify(value, null, 2) : "");
    },
    signError(code) {
      if (["REWARD_FORFEITED", "NO_REWARD"].includes(code)) rewards.block(code);
      text("#sign-status", errorCopy[code]?.[lang === "id" ? 0 : 1] || code);
    },
    leaderboard(rows) {
      $("#leaderboard").replaceChildren(
        ...(rows?.length
          ? rows
          : [{ name: t(rows ? "emptyBoard" : "unavailableBoard") }]
        ).map((row) => {
          const li = document.createElement("li");
          li.textContent =
            row.score === undefined ? row.name : `${row.name} · ${row.score}`;
          return li;
        }),
      );
    },
    requestError(code) {
      toast(errorCopy[code]?.[lang === "id" ? 0 : 1] || code);
    },
    error(value) {
      text("#error", value);
      $("#error").hidden = false;
    },
  };
}
