# Ndobol Sesarengan · game web

HTML/CSS/ES modules native, Three.js0.170.0 lokal, tanpa bundler. Semua model, tekstur dunia, dan suara prosedural. Logo memakai aset proyek.

Jalankan `npm ci --ignore-scripts` lalu `npm run dev` dari root. Buka http://127.0.0.1:4174/apps/web/index.html melalui browser dengan wallet EVM. Hubungkan wallet, pindah Monad Testnet10143, tanda tangani login, lalu buat/gabung room. Satu manusia bisa mulai dengan3 bot. Tidak ada akses guest pada UI publik; modul simulasi lokal tetap untuk tes.

WASD berjalan di dek; ←/→ atau J/L memutar360°; **tahan Spasi** untuk gas berkelanjutan; Q/E mengambil sampah. Kontrol sentuh tersedia. Dorongan ke arah hadap, gas keluar ke belakang. Jaga keseimbangan: terbalik/tenggelam menggugurkan kru dan menghanguskan reward ronde.

Track: Selokan Mataram dan Kali Progo. ID internal bengawan/mahakam dipertahankan untuk kompatibilitas data. Mataram kanal berdinding, Progo berbatu dengan jeram. Dunia merupakan interpretasi gameplay, bukan peta nyata.

Multiplayer otoritatif30Hz, protokol4. Wallet EOA dibuktikan dengan pesan EIP-191 sebelum masuk room; proof reward EIP-712 dibayar lewat RiverRewards hanya jika kontrak dikonfigurasi, aktif dan didanai.1kg=0,00001MON; getek ban0,00015MON. Semua getek masih bebas dicoba; pembelian belum tersedia.

Panduan pengelola: [deployment](../../docs/deployment.md), [reward](../../docs/rewards.md), [hasil ukur](../../docs/perf.md). Login wallet tidak memerlukan private key server. Tanpa pool, gameplay dan database tetap bekerja, klaim nonaktif.
