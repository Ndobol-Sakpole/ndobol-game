# Feedback
`createFeedback()` → root,unlock,setEnabled,sound(type,slot),splash(position,strength),gas(position,direction,slot),update(dt),dispose.

Pool tetap:64 tetesan dan48 kepulan gas instanced. WebAudio kentut memakai sawtooth dengan modulasi flutter, low-pass dan envelope pendek; varian per slot. Bunyi ban pecah lebih tajam. Audio aktif hanya setelah gesture; mute pada lobi/pengaturan. Preferensi reduced-motion menekan partikel/kamera, bukan aturan. Tidak ada rekaman eksternal atau jaringan audio.

River revision: 96 soft instanced billboard clouds, update(dt,camera); generated fartSamples() combines flutter harmonics and breath noise, bounded envelope and per-slot variants. No recorded sound.

## Current revision — 24 October 2026
thrust(slots:number[]) sustains up to four cached procedural flutter/turbulence loops. Release uses a short gain ramp; mute/blur/hidden/dispose clears voices. No audio downloads. See docs/visual-audio.md for references.
