ALTER TABLE profile_links ADD COLUMN display_id text;

UPDATE profile_links SET display_id = display_id('pf') WHERE display_id IS NULL;

CREATE UNIQUE INDEX profile_links_display_id_key ON profile_links (display_id);

ALTER TABLE profile_links ALTER COLUMN display_id SET DEFAULT display_id('pf');
ALTER TABLE profile_links ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE profile_links ADD CONSTRAINT profile_links_display_id_shape
    CHECK (display_id ~ '^pf_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
