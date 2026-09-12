ALTER TABLE users ADD COLUMN theme text NOT NULL DEFAULT 'system';
ALTER TABLE users ADD CONSTRAINT users_theme_enum CHECK (theme IN ('dark', 'light', 'system'));

ALTER TABLE users ADD COLUMN profile_visibility text NOT NULL DEFAULT 'private';
UPDATE users SET profile_visibility = CASE WHEN profile_public THEN 'public' ELSE 'private' END;
ALTER TABLE users ADD CONSTRAINT users_profile_visibility_enum
    CHECK (profile_visibility IN ('public', 'members', 'private'));

ALTER TABLE users ADD COLUMN pinned_event_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD CONSTRAINT users_pinned_event_ids_max CHECK (cardinality(pinned_event_ids) <= 3);

CREATE OR REPLACE FUNCTION sync_profile_public() RETURNS trigger AS $$
BEGIN
    NEW.profile_public := (NEW.profile_visibility = 'public');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_sync_profile_public
    BEFORE INSERT OR UPDATE OF profile_visibility ON users
    FOR EACH ROW EXECUTE FUNCTION sync_profile_public();
