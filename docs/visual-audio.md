# Held gas, canal and character revision — 24 October 2026

## Input and sound
Space and the touch gas button now send a held boolean. Server retains it between packets, clears on release, and expires it after 350ms without fresh input. Force direction still follows 360° facing. Impulses remain rate-limited to 0.32s; packet/key-repeat spam cannot add force. Reach remains edge-triggered. Blur, visibility loss, pointer cancellation and disabling input clear controls. The four-slot sound engine uses a cached sustained loop, pressure/flutter pulses and filtered turbulence; gain ramps avoid clicks. Release/mute/hidden-tab shuts voices down. No rhythm bar, new resource meter or audio dependency.

Requested references were researched: [Fart Together's official description](https://store.steampowered.com/app/5117550/Fart_Together/) describes shared raft propulsion with direction and gas power; it does not disclose its simulation/source/audio implementation. [Breviceps – Fart 3](https://freesound.org/people/Breviceps/sounds/446000/) is a CC0 sound reference (0.897s). No recording was downloaded or sampled; no proprietary Fart Together audio was copied. The game waveform is original procedural synthesis; subjective sound similarity still needs listening/playtest feedback.

## Selokan Mataram
[DIY's official heritage record](https://jogjacagar.jogjaprov.go.id/detail/716/selokan-mataram) describes a 4–12m irrigation canal, stone revetments, trapezoidal sections (rectangular in dense settlements), bridges and culverts. Game uses the wide 12m section for raft clearance: straighter spline, tall masonry banks, concrete inspection paths, waterline moss, three elevated bridges and side drain mouths. It is a stylized segment, not a geographic reconstruction. Progo retains natural unequal banks, volcanic obstacles and shared rapid intervals. No external textures/models.

## Characters
Reference: `output/ndobol-3d-v2/previews/characters-front-sheet.jpg`. Added iris/pupil highlights, blinks, finger/toe details, pouch flaps/clasps, stitched scarf/vest details, cat whiskers, crocodile belly ridges and larger squirrel tail. Sustained thrust compresses and shakes the pose. Detail stays instanced procedural geometry, not the unrigged 80k-triangle GLB assets. This intentionally preserves the native procedural-assets requirement and animated body hierarchy.

## Interfaces
Protocol is now **v4**; simulation reward format remains rules v5. `hello` accepts `authToken`, input `fart` means held thrust, player snapshots add `thrustActive`. `createFeedback().thrust(slots)` drives sustained sound. `createWalletUI().ensure()` connects, switches testnet and verifies login; `createUI().enter()` opens the lobby after success. API `createApiServer` accepts a persistence adapter; signer `get()` is async. Rooms accept async persistence and publish `persistence.saving/saved/error`. All current callers updated. See protocol/signing/deployment docs.

Medium rendering uses max 1.25× pixel ratio and shadow refresh at 20Hz (high 30Hz), while physics remains 30Hz and rendering independent. Camera/light shadow anchor moves with shadow refresh to avoid stale projection. Low quality still disables shadows.
