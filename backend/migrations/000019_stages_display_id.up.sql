ALTER TABLE stages ADD COLUMN display_id text;

UPDATE stages SET display_id = display_id('st') WHERE display_id IS NULL;

CREATE UNIQUE INDEX stages_display_id_key ON stages (display_id);

ALTER TABLE stages ALTER COLUMN display_id SET DEFAULT display_id('st');
ALTER TABLE stages ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE stages ADD CONSTRAINT stages_display_id_shape
    CHECK (display_id ~ '^st_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
