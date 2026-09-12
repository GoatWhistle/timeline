ALTER TABLE event_track_prizes ADD COLUMN title text;

ALTER TABLE event_track_prizes ALTER COLUMN place DROP NOT NULL;

ALTER TABLE event_track_prizes DROP CONSTRAINT event_track_prizes_place_range;

ALTER TABLE event_track_prizes
    ADD CONSTRAINT event_track_prizes_place_range
        CHECK (place IS NULL OR place BETWEEN 1 AND 20);

ALTER TABLE event_track_prizes
    ADD CONSTRAINT event_track_prizes_title_len
        CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 120);

ALTER TABLE event_track_prizes
    ADD CONSTRAINT event_track_prizes_place_or_title
        CHECK (place IS NOT NULL OR title IS NOT NULL);

DROP INDEX event_track_prizes_track_idx;

CREATE INDEX event_track_prizes_track_idx
    ON event_track_prizes (track_id, place NULLS LAST, title);

CREATE UNIQUE INDEX event_track_prizes_track_title_key
    ON event_track_prizes (track_id, btrim(lower(title)))
    WHERE place IS NULL;
