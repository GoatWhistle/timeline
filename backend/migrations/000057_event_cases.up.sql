CREATE TABLE event_cases (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id   text        NOT NULL DEFAULT display_id('cs'),
    event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    track_id     uuid        REFERENCES event_tracks (id) ON DELETE SET NULL,
    case_no      integer     NOT NULL,
    name         text        NOT NULL,
    description  text,
    partner      text,
    prize_amount numeric(14, 2),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT event_cases_display_id_key UNIQUE (display_id),
    CONSTRAINT event_cases_display_id_shape
        CHECK (display_id ~ '^cs_[23456789abcdefghjkmnpqrstuvwxyz]{12}$'),
    CONSTRAINT event_cases_event_no_key UNIQUE (event_id, case_no),
    CONSTRAINT event_cases_no_range CHECK (case_no BETWEEN 1 AND 200),
    CONSTRAINT event_cases_name_len CHECK (length(btrim(name)) BETWEEN 1 AND 200),
    CONSTRAINT event_cases_description_len
        CHECK (description IS NULL OR length(description) <= 4000),
    CONSTRAINT event_cases_partner_len
        CHECK (partner IS NULL OR length(btrim(partner)) BETWEEN 1 AND 200),
    CONSTRAINT event_cases_prize_whole
        CHECK (prize_amount IS NULL OR (prize_amount >= 0 AND prize_amount = trunc(prize_amount)))
);

CREATE INDEX event_cases_event_idx ON event_cases (event_id, case_no);
CREATE INDEX event_cases_track_idx ON event_cases (track_id);

CREATE TRIGGER event_cases_set_updated_at BEFORE UPDATE ON event_cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION event_cases_track_matches_event() RETURNS trigger AS $$
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

CREATE TRIGGER event_cases_track_guard
    BEFORE INSERT OR UPDATE ON event_cases
    FOR EACH ROW EXECUTE FUNCTION event_cases_track_matches_event();
