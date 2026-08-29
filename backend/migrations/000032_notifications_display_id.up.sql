ALTER TABLE notifications ADD COLUMN display_id text;

UPDATE notifications SET display_id = display_id('nt') WHERE display_id IS NULL;

CREATE UNIQUE INDEX notifications_display_id_key ON notifications (display_id);

ALTER TABLE notifications ALTER COLUMN display_id SET DEFAULT display_id('nt');
ALTER TABLE notifications ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE notifications ADD CONSTRAINT notifications_display_id_shape
    CHECK (display_id ~ '^nt_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
