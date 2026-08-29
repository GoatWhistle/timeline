ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_display_id_shape;
DROP INDEX IF EXISTS invites_display_id_key;
ALTER TABLE invites DROP COLUMN IF EXISTS display_id;
