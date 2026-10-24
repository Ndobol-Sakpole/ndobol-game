-- Rebuild only the parent table to extend its CHECK constraint. References keep the same name.
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;
CREATE TABLE rounds_weight (
 id TEXT PRIMARY KEY, track_id TEXT NOT NULL CHECK(track_id IN ('bengawan','mahakam')),
 duration_ms INTEGER NOT NULL CHECK(duration_ms > 0), completed INTEGER NOT NULL CHECK(completed IN (0,1)),
 reason TEXT NOT NULL CHECK(reason IN ('finish','timeout','capsized','sunk')), mode TEXT NOT NULL CHECK(mode='online'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 raft_id TEXT NOT NULL DEFAULT 'bambu-polos', rules_version INTEGER NOT NULL DEFAULT 2, hull_json TEXT
);
INSERT INTO rounds_weight SELECT * FROM rounds;
DROP TABLE rounds;
ALTER TABLE rounds_weight RENAME TO rounds;
ALTER TABLE round_players ADD COLUMN weight_grams INTEGER NOT NULL DEFAULT 0 CHECK(weight_grams>=0);
ALTER TABLE round_players ADD COLUMN reward_wei TEXT NOT NULL DEFAULT '0';
ALTER TABLE round_players ADD COLUMN pickup_json TEXT NOT NULL DEFAULT '[]';
PRAGMA user_version=4;
COMMIT;
PRAGMA foreign_keys=ON;
