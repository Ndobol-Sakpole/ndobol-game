# Network v3
`client.js:createClient({onMessage,onStatus})` → connect/send(type,payload)/close({forget})/result(roundId,create), getters session/serverNow/rtt. Native WS same-origin /rooms; HTTP /api. Token resume di sessionStorage, tidak masuk snapshot/debug.

`interpolation.js:createInterpolator({delayMs,maxExtrapolationMs})` → push(state,serverTime),sample(serverNow),reset. Linear pose getek/kru, facing lintasan sudut terpendek, extrapolation maksimum100ms. Buffer normal120ms; solo memakai satu tick. Prediksi gas sendiri di game/session.js; rekonsiliasi lastSeq. Input hanya fart,moveX,moveZ,turn,reach; posisi dan kerusakan dihitung server. Definisi v3 di shared/messages.js dan docs/protocol.md.

Interpolator juga menghaluskan finished snapshots untuk animasi terbalik/tenggelam; tidak extrapolate translasi setelah ronde berakhir. Wire3 compatible, rules5 state documented in docs/rewards.md.

## Current revision — 24 October 2026
Protocol4: hello includes wallet authToken; create/join/resume require verified wallet. Public endpoint helpers apiUrl/roomUrl read runtime-config.js, default to same-origin local proxy. No secrets in runtime config.
