# Track schema
JSON: `{id,name,region,seed,width,palette,flora,path,obstacles,trash,animals}`.
- `path`: array `[x,z]` dalam meter; sungai mengalir menuju Z negatif. Curve tidak closed.
- `width`: lebar sungai. `s`: jarak sepanjang spline dalam meter; `lateral`: offset positif ke kanan.
- `palette`: water/deep/grass/soil/bamboo/leaf/sky/fog hex.
- `flora`: proporsi bamboo/coconut.
- `obstacles`: `{type:rock|hyacinth|log,s,lateral,radius}`; radius proxy tabrakan.
- `trash`: `{type:bottle|bag|can,s,lateral}`; id deterministik `trackId:index`.
- `animals`: `{type:duck|buffalo|proboscis,s,lateral}`.
Mahakam lebih hijau/rimbun dan lebih banyak bambu/bekantan; Bengawan lebih hangat dengan kelapa. Penempatan adalah ilustrasi permainan, bukan survei ekologis. Ketiga spesies ditampilkan sebagai demonstrasi aset pada kedua track.

Field obstacle `sharp:true` pada log dipakai bersama oleh visual ujung runcing dan aturan ban pecah. Batu/eceng tidak tajam. Layout, panjang spline dan dua track lama tetap sama.

## Current revision — 24 October 2026
Mataram uses a straighter 12m canal section (kind:canal), recalculated length, smaller obstacle radii and fixed bank heights. Legacy track IDs remain unchanged.
