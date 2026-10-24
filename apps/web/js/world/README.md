# World
`loadTrack(id)` → Promise track JSON + `{curve,length,frame(distance,lateral)}`. `frame` mengembalikan `{position,tangent,right,yaw}` pada spline Catmull-Rom terparameter panjang busur. Track id allow-list: bengawan/mahakam.

`createEnvironment(track,quality)` → `{root,sky,fog,update(seconds,focus),dispose}`. Air memakai gelombang vertex dengan rumus yang sama seperti `waveHeight`, Fresnel refleksi warna langit + sun specular (bukan planar reflection), kabut, langit/matahari siklus pagi–sore sekitar 12,6 menit. Tepian ribbon mengikuti spline. Bambu, ruas, kanopi, kelapa, daun, rumput, batu tepian dan bukit memakai instancing; seed konsisten per track. Low-poly sebagai arah artistik.

`createObstacles(track)` → `{root,update(seconds),dispose}`; batu statis, kayu dan eceng bergerak mengambang. Collision proxy disimpan pada JSON, diperiksa oleh simulasi.

`createAmbient()` → `{setEnabled(bool):Promise,dispose}`. WebAudio noise terfilter sintetis, dibuat setelah gestur pengguna, default mati.

Revisi playtest: logs sharp:true memiliki ujung runcing yang terlihat; details.js:createRiverDetails(track) menambah dermaga/gubuk, gelagah, batu kecil dan gerbang finis prosedural. Bahan air menambah tepian berbusa; terrain menerima tetapi tidak memancarkan shadow map untuk menghindari acne pada ribbon besar.

River revision: display names Selokan Mataram/Kali Progo, stable legacy IDs. materials.js builds canvas grain/bump maps; terrain.js builds unequal bank slopes; foliage.js curved instanced blades/leaves. JSON adds bank and rapids. Water shader/foam share the same rapid intervals as the simulator. details.update(time) animates foam; START/FINISH distances come from GAME.

## Current revision — 24 October 2026
Mataram JSON has kind:canal and width12; terrainStrip + canal.js build masonry slopes, inspection paths, moss, elevated bridges and outlets. Progo stays natural. Medium shadows refresh20Hz/high30Hz independently of simulation. Physical length is shared by renderer/server.
