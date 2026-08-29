ALTER TABLE system_events ADD COLUMN display_id text;

UPDATE system_events SET display_id = display_id('sy') WHERE display_id IS NULL;

CREATE UNIQUE INDEX system_events_display_id_key ON system_events (display_id);

ALTER TABLE system_events ALTER COLUMN display_id SET DEFAULT display_id('sy');
ALTER TABLE system_events ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE system_events ADD CONSTRAINT system_events_display_id_shape
    CHECK (display_id ~ '^sy_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
