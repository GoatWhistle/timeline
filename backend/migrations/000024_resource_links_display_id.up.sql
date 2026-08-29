ALTER TABLE resource_links ADD COLUMN display_id text;

UPDATE resource_links SET display_id = display_id('rl') WHERE display_id IS NULL;

CREATE UNIQUE INDEX resource_links_display_id_key ON resource_links (display_id);

ALTER TABLE resource_links ALTER COLUMN display_id SET DEFAULT display_id('rl');
ALTER TABLE resource_links ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE resource_links ADD CONSTRAINT resource_links_display_id_shape
    CHECK (display_id ~ '^rl_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
