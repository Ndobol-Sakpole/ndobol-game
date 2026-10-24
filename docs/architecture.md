> Pembaruan terkini: [aturan v5, kegagalan hull dan reward MON](rewards.md).

# Architecture — Fase 2

```text
Native DOM lobby/HUD → EventBus → game/session → WebSocket input only
keyboard/touch ──────────────────────┘                 ↓
shared/game rules ← offline demo                rooms (30Hz authority)
       ↓                                              ↓
local state                 interpolation ← snapshots 15Hz
       └───────────────────────┬───────────────────────┘
                  procedural world / entities / camera → Three renderer

server finish → SQLite rounds + participants + personal best per track
              → session-authorized signing → stored EIP-712 proof
              → disabled Claim UI (Phase 3 verification not implemented)
```

One rule implementation, no FE/BE copies to drift. Native browser imports only Three.js (pinned local import map), no build step. Backend Node http + ws + viem + built-in SQLite. No new infrastructure service or wallet integration. Modules own their lifetimes and document public contracts in README; main composes systems, not scoring or collision rules.

Renderer owns GPU only; entities accept state. Getek position is track distance/lateral from authoritative simulation. Quality changes rebuild visuals while preserving the session. Canonical track JSON includes spline-derived length so server need not load Three.js. Native touch/key input supplies action edges; the browser predicts only its own paddle, while interpolation smooths authoritative getek/other paddles.

Room state is memory-only in a single API process. Completed rounds, signatures, nonces and per-track bests are transactional SQLite data. A resume token binds session access, not ownership of the manually entered EVM address. Phase 3 must authenticate wallet ownership and implement the exact documented EIP-712 verifier before enabling economic claims.

Performance: instanced flora/trash/splash pool, capped DPR, fog and quality presets; no postprocess/reflection targets. Network snapshots serialize once per room; bounded event history; snapshots coalesce during scheduler catch-up rather than flooding intermediate poses. HUD updates at 10Hz, debug 2Hz. See perf.md for measured results and limits.

## Physics playtest revision
Shared game now owns hull physics and crew walking, protocol v3 transports input pulses/axes and authoritative poses. Six procedural hulls and eight concept-based characters are presentation factories; data migration003 stores raft_id/rules_version/hull_json. EIP-712 remains v2. See physics-playtest.md for controls, tradeoffs, references and model limits.

### River playtest / rules v4
Native world/terrain/material modules remain render-only; shared/game/water and physics drive deterministic current, collisions and free thrust. Main receives additive state fields and shortest-arc interpolation. Solo uses one character unless bots are explicitly selected. ui/wallet + wallet/client isolate the optional EIP-1193 UI; there are no transaction calls. See river-update.md for exact API changes and stable legacy track IDs.
