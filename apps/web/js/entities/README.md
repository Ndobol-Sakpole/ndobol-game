# Entities
Semua factory menyediakan root/update/dispose; hanya presentasi, aturan ada di shared/game.

- `createGetek(type='bambu-polos')` → root,deck,deckHeight,slots,type,update(frame,time,state),dispose. Enam hull sesuai shared/game/rafts.js; material grain memakai canvas, batang/tali/dekorasi di-instance. State roll/pitch/heading/heave/floats mengendalikan pose/deflasi. Tidak ada dayung.
- `createAnimal(type)` → delapan karakter referensi dog/cat/duck/monkey/pig/squirrel/crocodile/snake via characters.js, ditambah buffalo/proboscis lama. update(time,{walk,gas}?) dan react(time,strength) menggerakkan kaki, tubuh dan ekspresi. Mesh per grup dianimasikan dengan instancing warna. Pemanggil menempelkan kru ke deck dan mengatur x/z/facing dari snapshot; disposal kru dahulu sebelum getek.
- `createTrash(track)` → entries,collect(id,time),update(time),dispose. Tiga jenis instanced dan efek angkat; state picked mencegah kemunculan ulang saat reconnect.

Referensi visual: output/ndobol-assets/getek & characters (PNG konsep). Tidak mengimpor model/tekstur eksternal; bentuk merupakan interpretasi prosedural.

Trash revision: instanced multi-part PET bottle/cap/labels, crumpled bag/handles and dented can/rims/tab share one rigid local matrix per prop. No detached accessories during float or pickup animations.

Fatal poses berasal dari shared stepWreck. Capsized merotasi dek180° dengan bagian bawah tetap muncul; sunk menurunkannya di bawah air. Label kru disembunyikan saat alive=false. Entity tidak memutuskan kematian/reward.

## Current revision — 24 October 2026
Character v2 adaptation: iris/highlight, blinks, digits, stitched accessories, pouch clasps, whiskers, larger tail. createCharacter signature unchanged; pose.thrustActive sustains the gas reaction. Runtime geometry remains procedural.
