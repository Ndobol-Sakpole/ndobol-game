BEGIN;
CREATE TABLE IF NOT EXISTS sponsored_claims (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  max_fee_wei TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
PRAGMA user_version=6;
COMMIT;
