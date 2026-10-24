# Shared rules v5

`createRound(track,{roundId,config,mode,raftId})` → state/addPlayer/start/queueInput/step/snapshot/setConnected/consumeFinish. Fixed30Hz; lobby/countdown/running/finished/results. Server dan demo memakai aturan identik. Solo satu pemain; online minimum2 slot manusia/bot.

`physics.js`: initHull/walkPlayer/resolveCrewContacts/gasImpulse/stepHull/impactHull/stepWreck. Posisi meter, waktu detik, rotasi radian. Berat kru, spring/damper, momentum, arus, roll/pitch/heave dan pelampung rusak. Ambang kehilangan keseimbangan atau daya apung menghasilkan failureReason=capsized|sunk; stepWreck menggerakkan pose terminal. Semua pemain mati, input ditolak, reward hangus. Main lagi mereset semuanya.

`rewards.js`: trashMass(item),rewardWei(grams,reason),formatMon(wei),formatKg(grams). 1.000 poin/kg; 10.000.000.000 wei/gram. Massa botol35g/kantong12g/kaleng18g, atau weightGrams eksplisit pada track. Nominal string wei. Bot tidak dibayar; autopilot disconnect tidak mengambil sampah manusia. Offline hanya demo.

`scoring.js`: scorePlayer,scoringConfig(version),resultBounds,validateResult. V5 memverifikasi massa dari picked IDs; legacy2–4 tetap rumus lama. `rafts.js:priceWei` mengganti usd; semua pemakai garasi diperbarui. Enam getek masih bebas diuji; pembelian/mint belum aktif.

Kentut bebas, cooldown320ms, arah facing+heading. Air tenang tanpa autopropulsi. Tidak ada irama/bonus kekompakan. beat/cohesion/syncBeats tetap nol demi kompatibilitas wirev3.

Detail kontrak state, harga dan aturan reward: ../../docs/rewards.md.
