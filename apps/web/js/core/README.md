# Core
- `createRenderer(canvas,quality)` → renderer/resize/setQuality/render(scene,camera)/dispose. Three0.170, ACES, sRGB, PCF soft shadows.
- `createLoop(update,render)` → start/stop/dispose. Update fixed60Hz; session menjalankan simulasi30Hz; rAF render dengan dt dibatasi100ms. Tab tersembunyi mengosongkan accumulator.
- `createInput()` → sample/setEnabled/dispose. V3 sample `{fart:boolean,moveX:-1|0|1,moveZ:-1|0|1,turn:-1|0|1,reach:-1|0|1}`. WASD jalan; J/L/←/→ putar; Space kentut edge; Q/E angkat. Multi-touch, blur/cancel cleanup, keyboard repeat tidak membuat pulse.
- `createEventBus()` → on(type,fn):unsubscribe/emit(type,payload)/clear.
- QUALITY: low/medium/high pixel ratio1/1.5/2, flora55/110/180, shadow false/1024/2048. Nilai shader/simulasi tidak dipengaruhi kualitas.
- procedural.js: materials/mesh/instancing/RNG/disposal GPU. Unit meter, Y ke atas. Tidak ada aturan bisnis pada renderer.

## Current revision — 24 October 2026
Space/touch gas is held, Q/E stays edge-triggered. Blur/hidden/cancel releases controls. Medium DPR cap1.25.
