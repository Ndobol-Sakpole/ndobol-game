# Authoritative rooms
`attachRooms(httpServer,{config,persist,manual,allowedOrigins})` returns room manager methods, `wss`, timing `stats`, and `close()`. Production leaves `manual=false`: 30Hz fixed simulation, 15Hz snapshots, monotonic clock, bounded catch-up. `manual=true` is an in-process test option, never a network message/environment timescale.

`createRoomManager({config,now,persist})`: `handle(client,type,payload)`, `step()`, `sweep()`, `disconnect(client)`, `broadcast(room)`, `rooms`, `close()`. Validate network commands with `shared/messages.js` before handle. Client implements `send(type,payload)`, optionally `sendEncoded(json)`, `close()`. Each broadcast serializes once for all room members. `persist(state,members)` runs synchronously once on finish; members expose only playerId/tokenHash. Failures are surfaced as persistence.error, never successful saves.

Track data comes directly from canonical frontend JSON; no Three.js server import. Protocol, reconnect and limits: `docs/protocol.md`. WebSocket transport uses pinned ws; handwritten Phase 1 parser has been retired.

Protocol v3: create menerima raftId opsional yang dikunci selama room, disimpan ulang ketika rematch. Server menjalankan shared hull physics dan posisi kru; reconnect mempertahankan keduanya.

## Current revision — 24 October 2026
Authenticated hello binds client.wallet; create/join/resume enforce it. persist may return Promise; persistence.saving/saved/error is broadcast after completion. Simulation ticks never await database I/O. Protocol4 input fart is held and expires350ms without packets.
