ALTER TABLE sessions ADD COLUMN display_id text;

UPDATE sessions SET display_id = display_id('se') WHERE display_id IS NULL;

CREATE UNIQUE INDEX sessions_display_id_key ON sessions (display_id);

ALTER TABLE sessions ALTER COLUMN display_id SET DEFAULT display_id('se');
ALTER TABLE sessions ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE sessions ADD CONSTRAINT sessions_display_id_shape
    CHECK (display_id ~ '^se_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
