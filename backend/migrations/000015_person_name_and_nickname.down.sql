ALTER TABLE event_participants DROP COLUMN IF EXISTS show_on_profile;

DROP TABLE IF EXISTS nickname_reservations;

ALTER TABLE users ADD COLUMN display_name text;

UPDATE users SET display_name = COALESCE(
    legacy_display_name,
    btrim(first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name));

ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_display_name_len
    CHECK (length(btrim(display_name)) BETWEEN 1 AND 120);
CREATE INDEX users_display_name_search_idx ON users (lower(display_name));

DROP INDEX IF EXISTS users_first_name_search_idx;
DROP INDEX IF EXISTS users_last_name_search_idx;
DROP INDEX IF EXISTS users_nickname_key;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_nickname_format;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_legacy_display_name_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_last_name_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_middle_name_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_first_name_len;

ALTER TABLE users DROP COLUMN IF EXISTS profile_public;
ALTER TABLE users DROP COLUMN IF EXISTS nickname;
ALTER TABLE users DROP COLUMN IF EXISTS legacy_display_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
ALTER TABLE users DROP COLUMN IF EXISTS middle_name;
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
