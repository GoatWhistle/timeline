ALTER TABLE participant_artifacts ADD COLUMN display_id text;

UPDATE participant_artifacts SET display_id = display_id('ar') WHERE display_id IS NULL;

CREATE UNIQUE INDEX participant_artifacts_display_id_key ON participant_artifacts (display_id);

ALTER TABLE participant_artifacts ALTER COLUMN display_id SET DEFAULT display_id('ar');
ALTER TABLE participant_artifacts ALTER COLUMN display_id SET NOT NULL;

ALTER TABLE participant_artifacts ADD CONSTRAINT participant_artifacts_display_id_shape
    CHECK (display_id ~ '^ar_[23456789abcdefghjkmnpqrstuvwxyz]{12}$');
