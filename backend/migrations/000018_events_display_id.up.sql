ALTER TABLE events ADD COLUMN display_id text;

UPDATE events SET display_id = display_id('ev') WHERE display_id IS NULL;

CREATE UNIQUE INDEX events_display_id_key ON events (display_id);

ALTER TABLE events ALTER COLUMN display_id SET DEFAULT display_id('ev');
ALTER TABLE events ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE events ADD CONSTRAINT events_display_id_shape
    CHECK (display_id ~ '^ev_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
