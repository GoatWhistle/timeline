ALTER TABLE invites ADD COLUMN display_id text;

UPDATE invites SET display_id = display_id('in') WHERE display_id IS NULL;

CREATE UNIQUE INDEX invites_display_id_key ON invites (display_id);

ALTER TABLE invites ALTER COLUMN display_id SET DEFAULT display_id('in');
ALTER TABLE invites ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE invites ADD CONSTRAINT invites_display_id_shape
    CHECK (display_id ~ '^in_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
