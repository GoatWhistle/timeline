CREATE TABLE event_tracks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id  text        NOT NULL DEFAULT display_id('tr'),
    event_id    uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    track_no    integer     NOT NULL,
    name        text        NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT event_tracks_display_id_key UNIQUE (display_id),
    CONSTRAINT event_tracks_display_id_shape
        CHECK (display_id ~ '^tr_[23456789abcdefghjkmnpqrstuvwxyz]{12}$'),
    CONSTRAINT event_tracks_event_no_key UNIQUE (event_id, track_no),
    CONSTRAINT event_tracks_no_range CHECK (track_no BETWEEN 1 AND 50),
    CONSTRAINT event_tracks_name_len CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    CONSTRAINT event_tracks_description_len CHECK (description IS NULL OR length(description) <= 4000),

    CONSTRAINT event_tracks_id_event_key UNIQUE (id, event_id)
);

CREATE INDEX event_tracks_event_idx ON event_tracks (event_id, track_no);

CREATE TRIGGER event_tracks_set_updated_at BEFORE UPDATE ON event_tracks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION event_tracks_require_hackathon() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = NEW.event_id AND kind = 'HACKATHON') THEN
        RAISE EXCEPTION 'only a hackathon can carry tracks'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_tracks_hackathon_guard
    BEFORE INSERT OR UPDATE ON event_tracks
    FOR EACH ROW EXECUTE FUNCTION event_tracks_require_hackathon();

INSERT INTO event_tracks (event_id, track_no, name)
SELECT id, 1, btrim(track) FROM events
WHERE track IS NOT NULL AND btrim(track) <> '' AND kind = 'HACKATHON';

ALTER TABLE events DROP CONSTRAINT events_track_len;
ALTER TABLE events DROP COLUMN track;

CREATE TABLE event_track_prizes (
    id         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id text           NOT NULL DEFAULT display_id('pz'),
    track_id   uuid           NOT NULL REFERENCES event_tracks (id) ON DELETE CASCADE,
    event_id   uuid           NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    place      integer        NOT NULL,
    amount     numeric(14, 2) NOT NULL,
    created_at timestamptz    NOT NULL DEFAULT now(),
    updated_at timestamptz    NOT NULL DEFAULT now(),

    CONSTRAINT event_track_prizes_display_id_key UNIQUE (display_id),
    CONSTRAINT event_track_prizes_display_id_shape
        CHECK (display_id ~ '^pz_[23456789abcdefghjkmnpqrstuvwxyz]{12}$'),
    CONSTRAINT event_track_prizes_track_place_key UNIQUE (track_id, place),
    CONSTRAINT event_track_prizes_place_range CHECK (place BETWEEN 1 AND 20),
    CONSTRAINT event_track_prizes_amount_whole CHECK (amount >= 0 AND amount = trunc(amount)),

    CONSTRAINT event_track_prizes_track_event_fk FOREIGN KEY (track_id, event_id)
        REFERENCES event_tracks (id, event_id) ON DELETE CASCADE
);

CREATE INDEX event_track_prizes_track_idx ON event_track_prizes (track_id, place);
CREATE INDEX event_track_prizes_event_idx ON event_track_prizes (event_id);

CREATE TRIGGER event_track_prizes_set_updated_at BEFORE UPDATE ON event_track_prizes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE team_event_entries ADD COLUMN track_id uuid
    REFERENCES event_tracks (id) ON DELETE SET NULL;

CREATE INDEX team_event_entries_track_idx ON team_event_entries (track_id);

CREATE OR REPLACE FUNCTION team_event_entries_track_matches_event() RETURNS trigger AS $$
BEGIN
    IF NEW.track_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM event_tracks WHERE id = NEW.track_id AND event_id = NEW.event_id
    ) THEN
        RAISE EXCEPTION 'the chosen track belongs to another event'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_event_entries_track_guard
    BEFORE INSERT OR UPDATE ON team_event_entries
    FOR EACH ROW EXECUTE FUNCTION team_event_entries_track_matches_event();
