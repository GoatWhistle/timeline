ALTER TABLE participant_tasks DROP CONSTRAINT IF EXISTS participant_tasks_display_id_shape;
DROP INDEX IF EXISTS participant_tasks_display_id_key;
ALTER TABLE participant_tasks DROP COLUMN IF EXISTS display_id;
