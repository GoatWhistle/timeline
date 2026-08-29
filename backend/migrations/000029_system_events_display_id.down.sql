ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_display_id_shape;
DROP INDEX IF EXISTS system_events_display_id_key;
ALTER TABLE system_events DROP COLUMN IF EXISTS display_id;
