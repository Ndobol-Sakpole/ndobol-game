PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
-- Preserve Phase 1 records, including their existing foreign keys, as unclaimable archives.
ALTER TABLE rounds RENAME TO rounds_v1;
ALTER TABLE leaderboard RENAME TO leaderboard_v1;
CREATE TABLE rounds (
 id TEXT PRIMARY KEY, track_id TEXT NOT NULL CHECK(track_id IN ('bengawan','mahakam')),
 duration_ms INTEGER NOT NULL CHECK(duration_ms > 0), completed INTEGER NOT NULL CHECK(completed IN (0,1)),
 reason TEXT NOT NULL CHECK(reason IN ('finish','timeout')), mode TEXT NOT NULL CHECK(mode='online'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE round_players (
 round_id TEXT NOT NULL REFERENCES rounds(id), session_id TEXT NOT NULL,
 player_id TEXT NOT NULL REFERENCES players(id), address TEXT, token_hash TEXT,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 3), animal TEXT NOT NULL,
 bot INTEGER NOT NULL CHECK(bot IN (0,1)), score INTEGER NOT NULL CHECK(score>=0),
 trash INTEGER NOT NULL CHECK(trash>=0), sync_beats INTEGER NOT NULL CHECK(sync_beats>=0),
 PRIMARY KEY(round_id,session_id), UNIQUE(round_id,slot)
);
CREATE TABLE signed_results (
 round_id TEXT NOT NULL, session_id TEXT NOT NULL, player_address TEXT NOT NULL,
 nonce INTEGER NOT NULL CHECK(nonce>=0), deadline INTEGER NOT NULL,
 payload_json TEXT NOT NULL, signature TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(round_id,session_id), UNIQUE(player_address,nonce),
 FOREIGN KEY(round_id,session_id) REFERENCES round_players(round_id,session_id)
);
CREATE TABLE player_nonces (address TEXT PRIMARY KEY, next_nonce INTEGER NOT NULL CHECK(next_nonce>=0));
CREATE TABLE sign_attempts (identity TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL);
CREATE TABLE leaderboard (
 player_id TEXT NOT NULL REFERENCES players(id), track_id TEXT NOT NULL,
 best_score INTEGER NOT NULL CHECK(best_score>=0), round_id TEXT NOT NULL REFERENCES rounds(id),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(player_id,track_id)
);
CREATE INDEX leaderboard_v2_track_score ON leaderboard(track_id,best_score DESC,player_id);
CREATE INDEX round_players_session ON round_players(session_id,round_id);
PRAGMA user_version = 2;
COMMIT;
