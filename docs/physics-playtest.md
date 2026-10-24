# Visual & physics playtest — 24 Oktober 2026

Arah terbaru dari pengguna: selesaikan kualitas visual dan fisika lebih dahulu, ganti dayung dengan kentut, kru dapat berjalan untuk membagi berat, dan berikan karakteristik pada setiap getek. Ini revisi gameplay di atas Fase 2, bukan integrasi on-chain Fase 3.

## Referensi yang benar-benar dibaca

- Chat **Buat aset karakter dan getek**: delapan karakter dan enam raft, keluaran `output/ndobol-assets/`. Dibaca README, prompt/konstruksi, dan dilihat PNG ban bekas, sultan, anjing. Aset tersebut gambar 2D bergaya 3D; tidak memiliki mesh/rig/physics.
- `data/catalog.js`: identitas bandana merah anjing, rompi biru kucing, topi hijau bebek, tas kuning monyet, syal ungu babi, ekor tupai, gigi buaya, dan tubuh melingkar ular.
- `data/economy.js` dan `docs/design/economy-proposal.md`: harga USD draft 0/2/4/7/10/15. Tidak ada harga MON atau penjualan aktif. Website promosi tetap dikelola chat lain; file-file promosi tidak diubah dalam tugas ini.

## Interpretasi yang diimplementasikan

| Getek | Draft koleksi | Sifat | Konsekuensi |
|---|---:|---|---|
| Bambu polos | Gratis | Ringan, pegas apung lunak | Pusat berat di tepi menghasilkan oleng terbesar; kru perlu berpindah |
| Botol | US$2 | Ringan, hambatan agak besar | Benturan batu/kayu di atas ambang1.2m/s melepas ikatan pelampung di kuadran benturan |
| Ban bekas | US$4 | Redaman tinggi, stabil | Log bertanda sharp meletuskan ban di kuadran benturan; sisi itu turun |
| Drum biru | US$7 | Berat, ayunan lambat | Batu pada kecepatan>1.5m/s membuat drum penyok dan menambah hambatan |
| Ranjang hanyut | US$10 | Pegas paling lunak, pantulan besar | Kemiringan>0.22rad membasahi kasur; berat/hambatan bertambah, mengering perlahan |
| Sultan | US$15 | Massa tertinggi, momentum besar | Dorongan awal/belokan lebih lambat; perlu mengantisipasi arah |

Semua tersedia gratis dalam playtest. Harga tampil sebagai draft referensi; bukan pembelian, unlock, reward multiplier, atau perubahan ekonomi yang sudah disetujui untuk produksi. Bentuk hull/massa adalah pilihan gameplay; monetisasi nanti perlu memisahkan kosmetik dari akses mekanik.

## Model dan antarmuka

Satu implementasi deterministic pure-JS di shared/game/physics.js, dipanggil 30Hz oleh shared/game/round.js di server/solo. Titik berat rata-rata kru menargetkan roll/pitch dengan pegas dan redaman per hull. Dorongan kentut mengikuti facing kru plus heading hull; posisi kru menghasilkan torsi. Integrasi momentum memiliki drag dan speed cap4.6m/s. Kaki bisa tergelincir pada dek miring; kontak lingkaran lunak memisahkan kru. Batas dek mencegah jatuh dalam prototipe ini.

Empat kuadran pelampung menyimpan integritas0–1. Kerusakan sisi memengaruhi daya apung, heave, roll dan hambatan. Ban yang sama tidak berulang kali meletus pada kontak yang sama. Model ini fisika arcade yang dapat dituning, bukan simulasi hidrodinamika/soft-body. Semua collider rintangan berupa lingkaran proxy sepanjang spline; ban tidak diuji per segitiga mesh. Tidak ada tenggelam/game-over, pemulihan ban, atau permainan di darat.

Kontrol: WASD jalan; panah kiri/kanan atau J/L memutar arah gas; Spasi kentut sekali; Q/E menjangkau. Tombol sentuh setara. Gas cooldown450ms, irama1s; kekompakan memberi tambahan impuls dan skor sesuai konfigurasi. Nomor, panah, persentase keseimbangan, status kerusakan dan bar perjalanan tidak bergantung warna saja.

Protokol menjadi v3, field input fart/moveX/moveZ/turn/reach, pose kru x/z/facing/gas. Server tetap otoritatif; reconnect mempertahankan getek, posisi dan kerusakan. Input lama ditolak. Migrasi003 additive menyimpan raft_id/rules_version/hull_json. EIP-712 tetap domain/skema v2; klaim tetap nonaktif. Detail di protocol.md dan phase-2-interfaces.md.

## Visual dan rasa

Enam getek dihasilkan dari batang, torus, kotak, kain dan instancing; serat kayu/label digambar dengan canvas. Semua aset runtime tetap prosedural. Karakter bulat dengan ekspresi tidak simetris dan aksesori referensi, animasi kaki saat berjalan, tubuh mengejan dan ekor bergerak saat kentut. Efek gas memakai pool48 instanced spheres, percik64. WebAudio sawtooth dengan flutter, low-pass dan envelope pendek menghasilkan kentut per-slot; ban pecah punya varian. Bisa dimute; tidak ada file audio eksternal.

Bayangan lembut medium1024/high2048, kamera lobi menampilkan wajah kru dan kamera mengikuti saat bermain. Kamera menambah jarak pada layar sempit. Flora tetap instanced; tepian berbusa, gelagah, dermaga/gubuk sederhana dan gerbang finis memperjelas konteks sungai. UI garasi dan play panel memakai tema hijau gelap/emas dengan aksi utama terlihat di awal. Kualitas low tetap tanpa shadow maps.

## Perbedaan dari referensi

- Bentuk dan palet diambil dari konsep, tetapi detail bulu, tekstur resolusi tinggi, ukiran rumit dan pencahayaan offline PNG tidak disalin. Model ringan untuk browser adalah interpretasi, bukan konversi PNG menjadi mesh.
- Ranjang menjaga bagian tengah kosong; sultan tidak memakai atap/takhta. Semua deck bisa dilalui empat kru.
- Tetap memakai Bengawan/Mahakam yang sudah ada. Tidak mengganti track menjadi Selokan Mataram atau menambah map baru.
- Tidak ada marketplace, token baru, checkout, wallet, atau deployment.

Verifikasi teknis dan batas pengukuran: [perf.md](perf.md).

## Superseded by river playtest
The current behavior is documented in [river-update.md](river-update.md): free fart input, 360° hull/facing, one-character solo default, Progo rapids, revised score, actual logo, Start screen and optional wallet UI. Earlier rhythm/performance observations in this document describe the previous version.
