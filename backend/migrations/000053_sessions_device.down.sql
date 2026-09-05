DROP INDEX IF EXISTS sessions_device_idx;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_device_hash_shape;

ALTER TABLE sessions DROP COLUMN IF EXISTS device_hash;
