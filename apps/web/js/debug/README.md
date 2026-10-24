# Debug panel
`createDebug(bus)` → `{sample(dt,renderer.info),setQuality,snapshot,dispose}`. Snapshot menyimpan maksimal 120 sampel 0,5 detik. Panel FPS/draw calls, track/quality/camera/ambient. Event keluar bernama sama. FPS panel memakai delta requestAnimationFrame mentah; delta simulasi dibatasi terpisah. Tidak melakukan mutasi langsung ke state gameplay.

Fase 2: panel juga menampilkan rata-rata/minimum FPS pada maksimum 120 sampel ×0,5s; ganti kualitas mereset jendela ukur. Penggantian track terkunci saat berada dalam room; kualitas hanya membangun ulang visual, tidak memulai ulang ronde.
