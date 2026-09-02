ALTER TABLE events
    ADD COLUMN cover_manual_url text,
    ADD COLUMN cover_auto_url text,
    ADD COLUMN cover_auto_source text,
    ADD COLUMN cover_auto_fetched_at timestamptz;

ALTER TABLE events ADD CONSTRAINT events_cover_manual_url_stored
    CHECK (cover_manual_url IS NULL OR cover_manual_url LIKE '/api/v1/covers/%');

ALTER TABLE events ADD CONSTRAINT events_cover_auto_url_stored
    CHECK (cover_auto_url IS NULL OR cover_auto_url LIKE '/api/v1/covers/%');

ALTER TABLE events ADD CONSTRAINT events_cover_auto_source_len
    CHECK (cover_auto_source IS NULL OR length(cover_auto_source) BETWEEN 1 AND 2048);
