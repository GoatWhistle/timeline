ALTER TABLE resource_links DROP CONSTRAINT IF EXISTS resource_links_display_id_shape;
DROP INDEX IF EXISTS resource_links_display_id_key;
ALTER TABLE resource_links DROP COLUMN IF EXISTS display_id;
