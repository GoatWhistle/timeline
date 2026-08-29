ALTER TABLE participant_links ADD COLUMN display_id text;

UPDATE participant_links SET display_id = display_id('pl') WHERE display_id IS NULL;

CREATE UNIQUE INDEX participant_links_display_id_key ON participant_links (display_id);

ALTER TABLE participant_links ALTER COLUMN display_id SET DEFAULT display_id('pl');
ALTER TABLE participant_links ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE participant_links ADD CONSTRAINT participant_links_display_id_shape
    CHECK (display_id ~ '^pl_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
