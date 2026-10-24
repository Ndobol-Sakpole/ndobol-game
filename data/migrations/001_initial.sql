PRAGMA foreign_keys = ON;
BEGIN;
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, wallet_address TEXT UNIQUE, display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(wallet_address IS NULL OR (length(wallet_address) = 42 AND substr(wallet_address,1,2) = '0x'))
);
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id),
  track_id TEXT NOT NULL CHECK(track_id IN ('bengawan','mahakam')),
  score INTEGER NOT NULL CHECK(score >= 0), trash_count INTEGER NOT NULL CHECK(trash_count >= 0),
  duration_ms INTEGER NOT NULL CHECK(duration_ms > 0),
  status TEXT NOT NULL DEFAULT 'local' CHECK(status IN ('local','verified','submitted')),
  chain_id INTEGER CHECK(chain_id IN (10143,143)), transaction_hash TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('getek','paddle','animal-skin')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS leaderboard (
  player_id TEXT NOT NULL REFERENCES players(id), track_id TEXT NOT NULL CHECK(track_id IN ('bengawan','mahakam')),
  best_score INTEGER NOT NULL CHECK(best_score >= 0),
  round_id TEXT NOT NULL REFERENCES rounds(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(player_id,track_id)
);
CREATE INDEX IF NOT EXISTS rounds_player_created ON rounds(player_id,created_at);
CREATE INDEX IF NOT EXISTS leaderboard_track_score ON leaderboard(track_id,best_score DESC);
PRAGMA user_version = 1;
COMMIT;
