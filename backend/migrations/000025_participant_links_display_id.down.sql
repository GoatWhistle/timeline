ALTER TABLE participant_links DROP CONSTRAINT IF EXISTS participant_links_display_id_shape;
DROP INDEX IF EXISTS participant_links_display_id_key;
ALTER TABLE participant_links DROP COLUMN IF EXISTS display_id;
