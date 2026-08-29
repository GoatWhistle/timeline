DROP TABLE IF EXISTS participant_retrospectives;

DROP INDEX IF EXISTS tasks_due_scan_idx;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_timezone_len;

ALTER TABLE users DROP COLUMN IF EXISTS timezone;
