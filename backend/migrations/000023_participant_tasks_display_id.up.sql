ALTER TABLE participant_tasks ADD COLUMN display_id text;

UPDATE participant_tasks SET display_id = display_id('tk') WHERE display_id IS NULL;

CREATE UNIQUE INDEX participant_tasks_display_id_key ON participant_tasks (display_id);

ALTER TABLE participant_tasks ALTER COLUMN display_id SET DEFAULT display_id('tk');
ALTER TABLE participant_tasks ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE participant_tasks ADD CONSTRAINT participant_tasks_display_id_shape
    CHECK (display_id ~ '^tk_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
