ALTER TABLE registration_statuses DROP CONSTRAINT IF EXISTS registration_statuses_display_id_shape;
DROP INDEX IF EXISTS registration_statuses_display_id_key;
ALTER TABLE registration_statuses DROP COLUMN IF EXISTS display_id;
