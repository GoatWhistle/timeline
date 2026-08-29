ALTER TABLE events DROP CONSTRAINT IF EXISTS events_display_id_shape;
DROP INDEX IF EXISTS events_display_id_key;
ALTER TABLE events DROP COLUMN IF EXISTS display_id;
