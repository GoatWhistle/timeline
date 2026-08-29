ALTER TABLE users ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Moscow';

ALTER TABLE users ADD CONSTRAINT users_timezone_len
    CHECK (length(btrim(timezone)) BETWEEN 1 AND 64);

CREATE INDEX tasks_due_scan_idx ON participant_tasks (due_at)
    WHERE done_at IS NULL AND due_at IS NOT NULL;

CREATE TABLE participant_retrospectives (
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id    uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    went_well   text,
    went_badly  text,
    next_time   text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT retrospectives_pk PRIMARY KEY (user_id, event_id),
    CONSTRAINT retrospectives_went_well_len CHECK (went_well IS NULL OR length(went_well) <= 20000),
    CONSTRAINT retrospectives_went_badly_len CHECK (went_badly IS NULL OR length(went_badly) <= 20000),
    CONSTRAINT retrospectives_next_time_len CHECK (next_time IS NULL OR length(next_time) <= 20000),
    CONSTRAINT retrospectives_not_empty CHECK (
        went_well IS NOT NULL OR went_badly IS NOT NULL OR next_time IS NOT NULL)
);

CREATE TRIGGER retrospectives_set_updated_at BEFORE UPDATE ON participant_retrospectives
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
