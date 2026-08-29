ALTER TABLE notification_rules ADD COLUMN display_id text;

UPDATE notification_rules SET display_id = display_id('nr') WHERE display_id IS NULL;

CREATE UNIQUE INDEX notification_rules_display_id_key ON notification_rules (display_id);

ALTER TABLE notification_rules ALTER COLUMN display_id SET DEFAULT display_id('nr');
ALTER TABLE notification_rules ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE notification_rules ADD CONSTRAINT notification_rules_display_id_shape
    CHECK (display_id ~ '^nr_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
