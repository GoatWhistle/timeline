ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_display_id_shape;
DROP INDEX IF EXISTS notifications_display_id_key;
ALTER TABLE notifications DROP COLUMN IF EXISTS display_id;
