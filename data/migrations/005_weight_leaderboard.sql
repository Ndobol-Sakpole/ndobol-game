BEGIN IMMEDIATE;
-- Old count/finish points cannot be compared with gram-based points. Preserve them separately.
CREATE TABLE leaderboard_pre_weight AS
 SELECT l.* FROM leaderboard l JOIN rounds r ON r.id=l.round_id WHERE r.rules_version<5;
DELETE FROM leaderboard WHERE round_id IN (SELECT id FROM rounds WHERE rules_version<5);
PRAGMA user_version=5;
COMMIT;
