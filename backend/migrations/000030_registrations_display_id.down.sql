ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_display_id_shape;
DROP INDEX IF EXISTS registrations_display_id_key;
ALTER TABLE registrations DROP COLUMN IF EXISTS display_id;
