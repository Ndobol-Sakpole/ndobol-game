import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { validateRound } from "./validate-round.js";
import { GAME } from "../shared/game/config.js";
/** Synchronous, short SQLite transactions. The API owns this connection. */
export function createStore(filename = ":memory:") {
  if (filename !== ":memory:")
    mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  const migrationRoot = new URL("./migrations/", import.meta.url);
  for (const file of readdirSync(migrationRoot)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    if (
      db.prepare("PRAGMA user_version").get().user_version <
      Number(file.split("_")[0])
    )
      db.exec(readFileSync(new URL(file, migrationRoot), "utf8"));
  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  function persistRound(state, members) {
    const { durationMs } = validateRound(state);
    transaction(() => {
      db.prepare(
        "INSERT INTO rounds(id,track_id,duration_ms,completed,reason,mode,raft_id,rules_version,hull_json) VALUES(?,?,?,?,?,?,?,?,?)",
      ).run(
        state.roundId,
        state.trackId,
        durationMs,
        Number(state.completed),
        state.reason,
        state.mode,
        state.raftId || "bambu-polos",
        state.rulesVersion || 4,
        JSON.stringify({
          floats: state.floats || [1, 1, 1, 1],
          wetness: state.wetness || 0,
          failureReason: state.failureReason,
          flooding: state.flooding,
        }),
      );
      for (const p of state.players) {
        const existing = p.address
          ? db
              .prepare("SELECT id FROM players WHERE lower(wallet_address)=?")
              .get(p.address)
          : null;
        const id =
            existing?.id ||
            p.address ||
            `${p.bot ? state.roundId + ":" : ""}${p.id}`,
          hash = members.find((m) => m.playerId === p.id)?.tokenHash || null;
        db.prepare(
          "INSERT INTO players(id,wallet_address,display_name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name",
        ).run(id, p.address, p.name);
        db.prepare(
          "INSERT INTO round_players(round_id,session_id,player_id,address,token_hash,slot,animal,bot,score,trash,sync_beats,weight_grams,reward_wei,pickup_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          state.roundId,
          p.id,
          id,
          p.address,
          hash,
          p.slot,
          p.animal,
          Number(p.bot),
          p.score,
          p.trash,
          p.syncBeats,
          p.weightGrams || 0,
          p.rewardWei || "0",
          JSON.stringify(p.picked || []),
        );
        if (!p.bot)
          db.prepare(
            "INSERT INTO leaderboard(player_id,track_id,best_score,round_id) VALUES(?,?,?,?) ON CONFLICT(player_id,track_id) DO UPDATE SET best_score=excluded.best_score,round_id=excluded.round_id,updated_at=CURRENT_TIMESTAMP WHERE excluded.best_score>leaderboard.best_score",
          ).run(id, state.trackId, p.score, state.roundId);
      }
    });
  }
  return {
    db,
    persistRound,
    evidence(roundId, sessionId, hash) {
      return db
        .prepare(
          "SELECT rp.*,r.track_id,r.duration_ms,r.completed,r.reason,r.mode,r.rules_version FROM round_players rp JOIN rounds r ON r.id=rp.round_id WHERE rp.round_id=? AND rp.session_id=? AND rp.token_hash=? AND rp.bot=0",
        )
        .get(roundId, sessionId, hash);
    },
    evidenceByToken(roundId, hash) {
      return db
        .prepare(
          "SELECT session_id FROM round_players WHERE round_id=? AND token_hash=? AND bot=0",
        )
        .get(roundId, hash);
    },
    signed(roundId, sessionId) {
      const row = db
        .prepare(
          "SELECT payload_json FROM signed_results WHERE round_id=? AND session_id=?",
        )
        .get(roundId, sessionId);
      return row ? JSON.parse(row.payload_json) : null;
    },
    rate(identity, now, config = GAME) {
      return transaction(() => {
        const row = db
          .prepare("SELECT * FROM sign_attempts WHERE identity=?")
          .get(identity);
        if (!row || now - row.window_start >= config.signRateWindowMs) {
          db.prepare(
            "INSERT INTO sign_attempts(identity,window_start,attempts) VALUES(?,?,1) ON CONFLICT(identity) DO UPDATE SET window_start=excluded.window_start,attempts=1",
          ).run(identity, now);
          return true;
        }
        db.prepare(
          "UPDATE sign_attempts SET attempts=attempts+1 WHERE identity=?",
        ).run(identity);
        return row.attempts < config.signRateLimit;
      });
    },
    nonce(address) {
      return (
        db
          .prepare("SELECT next_nonce FROM player_nonces WHERE address=?")
          .get(address)?.next_nonce || 0
      );
    },
    saveSignature(evidence, payload) {
      transaction(() => {
        const m = payload.message;
        db.prepare(
          "INSERT INTO signed_results(round_id,session_id,player_address,nonce,deadline,payload_json,signature) VALUES(?,?,?,?,?,?,?)",
        ).run(
          evidence.round_id,
          evidence.session_id,
          evidence.address,
          Number(m.nonce),
          Number(m.deadline),
          JSON.stringify(payload),
          payload.signature,
        );
        db.prepare(
          "INSERT INTO player_nonces(address,next_nonce) VALUES(?,?) ON CONFLICT(address) DO UPDATE SET next_nonce=excluded.next_nonce",
        ).run(evidence.address, Number(m.nonce) + 1);
      });
    },
    leaderboard(trackId) {
      return db
        .prepare(
          "SELECT p.display_name AS name,l.best_score AS score,l.round_id AS roundId FROM leaderboard l JOIN players p ON p.id=l.player_id WHERE l.track_id=? ORDER BY l.best_score DESC,l.player_id ASC LIMIT 10",
        )
        .all(trackId);
    },
    close() {
      db.close();
    },
  };
}
