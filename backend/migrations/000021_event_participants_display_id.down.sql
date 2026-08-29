ALTER TABLE event_participants DROP CONSTRAINT IF EXISTS event_participants_display_id_shape;
DROP INDEX IF EXISTS event_participants_display_id_key;
ALTER TABLE event_participants DROP COLUMN IF EXISTS display_id;
