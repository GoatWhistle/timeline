ALTER TABLE users ADD COLUMN display_id text;

UPDATE users SET display_id = display_id('us') WHERE display_id IS NULL;

CREATE UNIQUE INDEX users_display_id_key ON users (display_id);

ALTER TABLE users ALTER COLUMN display_id SET DEFAULT display_id('us');
ALTER TABLE users ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_display_id_shape
    CHECK (display_id ~ '^us_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
