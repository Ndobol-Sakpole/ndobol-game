# Gameplay session
`local.js:createLocalRound(track,{name,animal,raftId})` memakai satu manusia (opsional3 bot) dan aturan shared/game yang sama dengan server. Hasil lokal tidak ditandatangani.

`session.js:createSession({onState,onEvent,onStatus,onError})` menyediakan solo/join/restore/send/leave/update(dt,input)/visual/rhythm, getter state/online/client. V3 input fart/moveX/moveZ/turn/reach; simulasi 30Hz. Mode lokal menginterpolasi satu tick; online snapshot buffer120ms, prediksi ringan gas sendiri dan rekonsiliasi lastSeq. Render hanya mengonsumsi pose/event.

`simulation.js` adalah fixture regresi Fase 1 yang tidak digunakan aplikasi/server. Jangan menambahkan fitur aktif di sana. Lihat docs/protocol.md dan docs/physics-playtest.md.

Rules v4: createLocalRound defaults to one centered human; `{bots:true}` adds three bots. No rhythm rendering or scoring. Free action edges use a short 320ms recovery only. World drift is zero in calm sections.

Rulesv5: session menghentikan input pada fase finished; kegagalan, gram, poin, reward dan bot mengikuti shared. Solo tetap demo tanpa signing. Main lagi membuat state baru, bukan menghidupkan hull gagal dalam ronde yang sama.
