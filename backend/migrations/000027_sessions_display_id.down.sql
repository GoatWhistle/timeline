ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_display_id_shape;
DROP INDEX IF EXISTS sessions_display_id_key;
ALTER TABLE sessions DROP COLUMN IF EXISTS display_id;
