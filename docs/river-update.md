# River playtest · 24 October 2026

## User-visible changes
Start screen with the existing brand logo → game lobby/garage → solo or room → countdown → game → results. Solo defaults to one centered character; optional three bots. Wallet remains optional for every mode.

Names are now **Selokan Mataram** and **Kali Progo**, both Yogyakarta. Internal IDs `bengawan` and `mahakam` are intentionally retained so stored rounds, track hashes in existing EIP-712 proofs, URLs and leaderboard foreign keys remain compatible. These IDs are technical legacy identifiers, not geography. Layouts are fictional playable interpretations, not surveyed reproductions.

Progo has three rapids at 62–99m, 164–207m and 271–312m and nine additional rock obstacles. Smooth current envelopes reach 2.6/3.1/2.8m/s with cross-currents, chop, dynamic foam and spring-driven vertical/roll/pitch response. Selokan Mataram and calm Progo sections have zero passive translation for readable control. Momentum decays after release; forward motion requires fart impulses or being in a rapid. A small 320ms action recovery prevents packet spam; there is no rhythm target, bonus or penalty.

Facing is 360°. Exhaust goes backward; thrust goes in the facing direction. World-relative velocity combines all player impulses, drag and current. Position relative to the hull center adds torque, and damaged floats are selected in the rotating hull's local coordinates. Heading wraps through 360° without auto-centering. Negative forward velocity allows braking and reversing. Collision normals resolve penetration every tick, independent of the feedback/damage cooldown. Total water-plane speed is bounded at 4.6m/s for stable fixed-step simulation and result validation.

Walking changes the center of mass, tilt and slip. All six hull tradeoffs remain. The model is deterministic arcade buoyancy/spring/damper physics, not a volumetric fluid or rigid-body engine. Crew cannot fall off; there is no capsizing/game-over. Bank collisions use the navigable river width. Maximum displacement per 30Hz tick remains much smaller than the smallest collision radius.

## Presentation
Procedural muddy water with advected noise, specular highlights, shore foam and rapid waves. Banks have differing elevations, eroded slopes and rolling terraces. Canvas grain/bump maps cover soil, grass, wood/bark and rocks. Curved grass blades/bamboo leaves replace solid foliage clumps. Trash now has shaped PET bottles with attached caps/labels, crumpled bags with handles, and dented cans with metal rims/tabs. Every part shares the same floating pose. Instancing remains in use.

START and FINISH gates plus water-level marker lines are placed at the exact simulation distances. No decorative sign is used as a separate finish trigger. Smoke uses a bounded pool of soft billboard particles from behind each character. Audio uses generated flutter/breath waveforms with low-pass decay, different variants and mute controls. Audio starts only after a user gesture.

## Interfaces / storage
Transport stays v3 because input and envelope shapes are unchanged. `state.rulesVersion=4`, `current`, `rapid`, `verticalVelocity` are additive snapshot fields; `beat`, `cohesion`, `syncBeats` are retained as zero legacy fields. New score = trash×100 + finish×500. DB `rules_version=4`; signer validates historical v2/v3 scores with the prior synchrony weight. EIP-712 domain/version/types stay unchanged and old signatures remain valid.

`stepHull(state,dt,config,track?)` now reads shared `sampleCurrent(track,s,lateral,time)`. `createLocalRound(track,{bots=false,...profile})` defaults to one player. `createRiverDetails(track)` adds update(time). `createFeedback().update(dt,camera)` billboards particles; audio synthesis is pure `fartSamples(sampleRate,variant,puncture)`.

Wallet adapter/UI contract: see apps/web/js/wallet/README.md. No contract deployment, signing requests from the browser, mint or claim transaction is activated. Server signing still needs the existing environment configuration. Browser profile changes never mutate an in-progress round's address.

## References and intentional differences
- Existing logo: frontend/assets/images/logo.webp (copied into the standalone game web root).
- [Fart Together official developer listing](https://store.steampowered.com/app/5117550/Fart_Together/): raft response to player force, direction and timing. We implement independent impulses, positional torque and 360° facing. No game code/assets were copied or exact numeric behavior inferred from the listing.
- [DIY cultural heritage description of Selokan Mataram](https://jogjacagar.jogjaprov.go.id/detail/716/selokan-mataram): canal intake from Progo and outflow to Opak; basis for the short countdown text.
- Rendering remains stylized procedural 3D with added material and terrain detail; it is not photogrammetry.

Pickup now measures distance from each actual crew position and projects left/right in that character's rotated frame. Total speed in the HUD includes lateral motion. Terrain/water continue beyond the simulation endpoints so the finish gate does not reveal an abrupt world edge.

## Verification
Lint and74tests pass. Native browser:1280×800 desktop +390×844 portrait; Start→mode selection, no-input solo, right-facing gas/full turn, touch input, optional bots, online create/ready/start→Progo finish→results→rematch. Wallet no-provider condition and guest continuation pass. Actual online round97s/12trash/one punctured tyre; rules v4 persisted. Final renderer/latency/load figures are in perf.md.

Remaining validation: physical midrange phone performance, actual installed-wallet permission prompt and switching, subjective audio balance and longer human co-op playtests. Claims are still disabled. Model remains bounded arcade physics. Earlier block-shaped rapid foam and visible world cutoff after finish were corrected with soft procedural alpha streaks and extended presentation terrain. No new runtime library was added.

The former `createUI().rhythm()` method is removed and its sole caller in main.js is updated. The session's legacy rhythm accessor is unused. `track.frame()` may extrapolate outside the course endpoints for scenery only; gameplay remains bounded to the original track length.
