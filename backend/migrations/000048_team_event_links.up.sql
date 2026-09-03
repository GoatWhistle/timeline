CREATE TABLE team_event_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id text        NOT NULL DEFAULT display_id('tl'),
    entry_id   uuid        NOT NULL REFERENCES team_event_entries (id) ON DELETE CASCADE,
    created_by uuid        NOT NULL REFERENCES users (id),
    url        text        NOT NULL,
    label      text,
    sort_order integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT team_event_links_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT team_event_links_label_len
        CHECK (label IS NULL OR length(btrim(label)) BETWEEN 1 AND 100),
    CONSTRAINT team_event_links_sort_order_range CHECK (sort_order BETWEEN 0 AND 1000),
    CONSTRAINT team_event_links_display_id_key UNIQUE (display_id),
    CONSTRAINT team_event_links_display_id_shape
        CHECK (display_id ~ '^tl_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX team_event_links_entry_idx ON team_event_links (entry_id, sort_order, created_at);

CREATE TRIGGER team_event_links_set_updated_at BEFORE UPDATE ON team_event_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
