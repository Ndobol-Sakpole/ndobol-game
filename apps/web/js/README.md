# Composition root
`main.js` wires UI/debug/input/session with procedural world, effects and renderer. `bootstrap.js` reports startup errors. Rules live in shared/game, orchestration/prediction in game/session. Main does not compute movement, pickup, collision, score or signing evidence.

Both small canonical track files load once before play. Track/quality rebuilds dispose GPU resources; quality preserves authoritative state, picked trash and crew. Read-only window.ndobolDebug exposes state/performance without bearer tokens. HTTP proof and leaderboard are presented only after an authoritative results phase. No on-chain calls.
