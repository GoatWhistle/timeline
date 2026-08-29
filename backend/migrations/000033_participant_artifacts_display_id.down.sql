ALTER TABLE participant_artifacts DROP CONSTRAINT IF EXISTS participant_artifacts_display_id_shape;
DROP INDEX IF EXISTS participant_artifacts_display_id_key;
ALTER TABLE participant_artifacts DROP COLUMN IF EXISTS display_id;
