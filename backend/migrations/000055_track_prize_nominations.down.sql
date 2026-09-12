DROP INDEX event_track_prizes_track_title_key;

DELETE FROM event_track_prizes WHERE place IS NULL;

DROP INDEX event_track_prizes_track_idx;

CREATE INDEX event_track_prizes_track_idx ON event_track_prizes (track_id, place);

ALTER TABLE event_track_prizes DROP CONSTRAINT event_track_prizes_place_or_title;
ALTER TABLE event_track_prizes DROP CONSTRAINT event_track_prizes_title_len;
ALTER TABLE event_track_prizes DROP CONSTRAINT event_track_prizes_place_range;

ALTER TABLE event_track_prizes
    ADD CONSTRAINT event_track_prizes_place_range CHECK (place BETWEEN 1 AND 20);

ALTER TABLE event_track_prizes ALTER COLUMN place SET NOT NULL;

ALTER TABLE event_track_prizes DROP COLUMN title;
