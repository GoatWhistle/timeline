ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_id_shape;
DROP INDEX IF EXISTS users_display_id_key;
ALTER TABLE users DROP COLUMN IF EXISTS display_id;
