ALTER TABLE event_participants ADD COLUMN display_id text;

UPDATE event_participants SET display_id = display_id('pa') WHERE display_id IS NULL;

CREATE UNIQUE INDEX event_participants_display_id_key ON event_participants (display_id);

ALTER TABLE event_participants ALTER COLUMN display_id SET DEFAULT display_id('pa');
ALTER TABLE event_participants ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE event_participants ADD CONSTRAINT event_participants_display_id_shape
    CHECK (display_id ~ '^pa_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
