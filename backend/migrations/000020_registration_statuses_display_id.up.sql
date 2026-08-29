ALTER TABLE registration_statuses ADD COLUMN display_id text;

UPDATE registration_statuses SET display_id = display_id('rs') WHERE display_id IS NULL;

CREATE UNIQUE INDEX registration_statuses_display_id_key ON registration_statuses (display_id);

ALTER TABLE registration_statuses ALTER COLUMN display_id SET DEFAULT display_id('rs');
ALTER TABLE registration_statuses ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE registration_statuses ADD CONSTRAINT registration_statuses_display_id_shape
    CHECK (display_id ~ '^rs_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
