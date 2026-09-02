ALTER TABLE events DROP CONSTRAINT IF EXISTS events_cover_auto_source_len;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_cover_auto_url_stored;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_cover_manual_url_stored;

ALTER TABLE events
    DROP COLUMN IF EXISTS cover_auto_fetched_at,
    DROP COLUMN IF EXISTS cover_auto_source,
    DROP COLUMN IF EXISTS cover_auto_url,
    DROP COLUMN IF EXISTS cover_manual_url;
