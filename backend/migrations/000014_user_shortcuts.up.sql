ALTER TABLE users ADD COLUMN shortcuts jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE users ADD CONSTRAINT users_shortcuts_object
    CHECK (jsonb_typeof(shortcuts) = 'object');
ALTER TABLE users ADD CONSTRAINT users_shortcuts_size
    CHECK (length(shortcuts::text) <= 8192);
