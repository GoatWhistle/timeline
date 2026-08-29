ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS notification_rules_display_id_shape;
DROP INDEX IF EXISTS notification_rules_display_id_key;
ALTER TABLE notification_rules DROP COLUMN IF EXISTS display_id;
