# Camera
`createCamera(canvas)` → `{camera,setMode('follow'|'orbit'),reset,resize,update(frame,dt,lobby),dispose}`. Kamera third-person memakai exponential damping yang independen FPS. Lobi memakai sudut komposisi terpisah. Debug orbit: drag dan wheel; radius 6–45m. Input orbit hanya pada canvas.

Fase 2 menambah `impact(strength=1)`; shake maksimal 0,15m dan cepat diredam. Preferensi reduced-motion mematikannya. Tidak memengaruhi posisi authoritative.

Revisi playtest: kamera lebih dekat dan miring untuk membaca kru/dek; lobi menghadapkan kru ke kamera. Jarak bertambah pada layar sempit agar dek tetap masuk viewport. Shake tetap ringan dan mengikuti reduced-motion.
