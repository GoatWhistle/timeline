CREATE TABLE participant_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    kind       text        NOT NULL,
    url        text        NOT NULL,
    title      text,
    sort_order integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    display_id text        NOT NULL DEFAULT display_id('pl'),

    CONSTRAINT participant_links_kind_enum CHECK (kind IN (
        'WEBSITE', 'RULES', 'REGISTRATION', 'SUBMISSION', 'CHAT', 'DATASET',
        'API_DOCS', 'JUDGING', 'MENTORS', 'RESULTS', 'SPONSOR', 'OTHER')),
    CONSTRAINT participant_links_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT participant_links_title_len CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT participant_links_display_id_shape
        CHECK (display_id ~ '^pl_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX participant_links_owner_idx ON participant_links (user_id, event_id, sort_order, created_at);

CREATE UNIQUE INDEX participant_links_display_id_key ON participant_links (display_id);

CREATE TRIGGER participant_links_set_updated_at BEFORE UPDATE ON participant_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
