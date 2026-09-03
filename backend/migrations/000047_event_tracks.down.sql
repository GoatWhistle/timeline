DROP TRIGGER IF EXISTS team_event_entries_track_guard ON team_event_entries;
DROP FUNCTION IF EXISTS team_event_entries_track_matches_event();
DROP INDEX IF EXISTS team_event_entries_track_idx;
ALTER TABLE team_event_entries DROP COLUMN IF EXISTS track_id;

DROP TABLE IF EXISTS event_track_prizes;

ALTER TABLE events ADD COLUMN track text;

UPDATE events e SET track = t.name
FROM event_tracks t
WHERE t.event_id = e.id AND t.track_no = 1;

ALTER TABLE events ADD CONSTRAINT events_track_len
    CHECK (track IS NULL OR length(btrim(track)) BETWEEN 1 AND 120);

DROP TRIGGER IF EXISTS event_tracks_hackathon_guard ON event_tracks;
DROP FUNCTION IF EXISTS event_tracks_require_hackathon();
DROP TABLE IF EXISTS event_tracks;
