DROP TRIGGER IF EXISTS users_sync_profile_public ON users;
DROP FUNCTION IF EXISTS sync_profile_public();

ALTER TABLE users DROP CONSTRAINT users_pinned_event_ids_max;
ALTER TABLE users DROP COLUMN pinned_event_ids;

ALTER TABLE users DROP CONSTRAINT users_profile_visibility_enum;
ALTER TABLE users DROP COLUMN profile_visibility;

ALTER TABLE users DROP CONSTRAINT users_theme_enum;
ALTER TABLE users DROP COLUMN theme;
