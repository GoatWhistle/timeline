CREATE TABLE resource_links (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    stage_id       uuid,
    stage_event_id uuid,
    kind           text        NOT NULL,
    url            text        NOT NULL,
    title          text,
    is_pinned      boolean     NOT NULL DEFAULT false,
    sort_order     integer     NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT resource_links_kind_enum CHECK (kind IN (
        'WEBSITE', 'RULES', 'REGISTRATION', 'SUBMISSION', 'CHAT', 'DATASET',
        'API_DOCS', 'JUDGING', 'MENTORS', 'RESULTS', 'SPONSOR', 'OTHER')),
    CONSTRAINT resource_links_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT resource_links_title_len CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT resource_links_stage_pair CHECK ((stage_id IS NULL) = (stage_event_id IS NULL)),
    CONSTRAINT resource_links_stage_same_event CHECK (stage_event_id IS NULL OR stage_event_id = event_id),
    CONSTRAINT resource_links_stage_fk FOREIGN KEY (stage_id, stage_event_id)
        REFERENCES stages (id, event_id) ON DELETE CASCADE
);

CREATE INDEX resource_links_event_idx ON resource_links (event_id, sort_order, created_at);
CREATE INDEX resource_links_stage_idx ON resource_links (stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX resource_links_pinned_idx ON resource_links (event_id, sort_order) WHERE is_pinned;

CREATE TRIGGER resource_links_set_updated_at BEFORE UPDATE ON resource_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

    CONSTRAINT participant_links_kind_enum CHECK (kind IN (
        'WEBSITE', 'RULES', 'REGISTRATION', 'SUBMISSION', 'CHAT', 'DATASET',
        'API_DOCS', 'JUDGING', 'MENTORS', 'RESULTS', 'SPONSOR', 'OTHER')),
    CONSTRAINT participant_links_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT participant_links_title_len CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 200)
);

CREATE INDEX participant_links_owner_idx ON participant_links (user_id, event_id, sort_order, created_at);

CREATE TRIGGER participant_links_set_updated_at BEFORE UPDATE ON participant_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
