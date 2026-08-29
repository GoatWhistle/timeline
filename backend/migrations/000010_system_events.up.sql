CREATE TABLE system_events (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type        text        NOT NULL,
    severity          text        NOT NULL DEFAULT 'INFO',
    audience_kind     text        NOT NULL,
    audience_user_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    subject_type      text,
    subject_id        uuid,
    payload_json      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    dedup_key         text,
    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT system_events_severity_enum CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    CONSTRAINT system_events_audience_enum CHECK (audience_kind IN ('ADMIN', 'USER')),
    CONSTRAINT system_events_audience_pair CHECK (
        (audience_kind = 'USER') = (audience_user_id IS NOT NULL)),
    CONSTRAINT system_events_subject_pair CHECK ((subject_type IS NULL) = (subject_id IS NULL)),
    CONSTRAINT system_events_type_len CHECK (length(btrim(event_type)) BETWEEN 1 AND 64),
    CONSTRAINT system_events_dedup_len CHECK (dedup_key IS NULL OR length(dedup_key) <= 200)
);

CREATE UNIQUE INDEX system_events_dedup_key_idx ON system_events (dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX system_events_admin_idx ON system_events (created_at DESC, id)
    WHERE audience_kind = 'ADMIN';
CREATE INDEX system_events_user_idx ON system_events (audience_user_id, created_at DESC, id)
    WHERE audience_kind = 'USER';
CREATE INDEX system_events_retention_idx ON system_events (created_at);

CREATE TABLE system_event_reads (
    event_id uuid        NOT NULL REFERENCES system_events (id) ON DELETE CASCADE,
    user_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT system_event_reads_pk PRIMARY KEY (event_id, user_id)
);

CREATE INDEX system_event_reads_user_idx ON system_event_reads (user_id, event_id);

CREATE TABLE observed_states (
    subject_key text PRIMARY KEY,
    state       text        NOT NULL,
    changed_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT observed_states_key_len CHECK (length(btrim(subject_key)) BETWEEN 1 AND 200),
    CONSTRAINT observed_states_state_len CHECK (length(btrim(state)) BETWEEN 1 AND 64)
);
