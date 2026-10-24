# Ndobol Sesarengan — Fase 1
Visi: 2–4 pemain mengayuh satu getek, mengangkat sampah dan menikmati sungai Nusantara. Fase ini hanya fondasi dunia 3D dan kontrol eksplorasi lokal; belum game co-op produksi.

Selesai secara implementasi: Bengawan/Mahakam data-driven; sungai spline, air vertex/Fresnel, tanah/rumput/instanced flora, kabut/langit/matahari pagi–sore; getek 11 batang bambu/ikatan/4 dayung/apung/oleng/tabrakan; bebek, kerbau, bekantan low-poly idle; botol/kantong/kaleng instanced/pickup effect; batu/eceng/log; follow camera dan orbit; HUD/lobi/debug/touch/audio sintetis opt-in. Semua aset prosedural.

Batas: model hewan adalah ilustrasi, penempatan contoh bukan peta biodiversitas. Refleksi air aproksimasi Fresnel/warna langit, fisika bukan rigid-body; dayung belum dikendalikan pemain berbeda. Skor lokal tidak menandakan dampak lingkungan terverifikasi. Slot lobi statis. No wallet, reward token, mint, marketplace, auth, persistence, multiplayer synchronization, live deployment.

Fase 2 yang disarankan: authoritative room 2–4 pemain → input per slot dayung → server tick + snapshots/interpolation/reconciliation → join/reconnect/leave → collision/pickup bersama yang idempotent → result validation/persistence. Setelah itu rancang EIP-712/domain/replay protection dan wallet flow sebelum mengaktifkan kontrak.
