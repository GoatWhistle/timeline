ALTER TABLE registrations ADD COLUMN display_id text;

UPDATE registrations SET display_id = display_id('rg') WHERE display_id IS NULL;

CREATE UNIQUE INDEX registrations_display_id_key ON registrations (display_id);

ALTER TABLE registrations ALTER COLUMN display_id SET DEFAULT display_id('rg');
ALTER TABLE registrations ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE registrations ADD CONSTRAINT registrations_display_id_shape
    CHECK (display_id ~ '^rg_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
