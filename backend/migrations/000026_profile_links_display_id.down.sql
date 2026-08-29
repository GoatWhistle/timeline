ALTER TABLE profile_links DROP CONSTRAINT IF EXISTS profile_links_display_id_shape;
DROP INDEX IF EXISTS profile_links_display_id_key;
ALTER TABLE profile_links DROP COLUMN IF EXISTS display_id;
