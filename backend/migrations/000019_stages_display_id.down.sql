ALTER TABLE stages DROP CONSTRAINT IF EXISTS stages_display_id_shape;
DROP INDEX IF EXISTS stages_display_id_key;
ALTER TABLE stages DROP COLUMN IF EXISTS display_id;
