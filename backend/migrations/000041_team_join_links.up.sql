CREATE TABLE team_join_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id text        NOT NULL DEFAULT display_id('tj'),
    team_id    uuid        NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    token_hash text        NOT NULL,
    created_by uuid        NOT NULL REFERENCES users (id),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT team_join_links_token_hash_key UNIQUE (token_hash),
    CONSTRAINT team_join_links_token_hash_len CHECK (length(token_hash) BETWEEN 32 AND 128),
    CONSTRAINT team_join_links_display_id_key UNIQUE (display_id),
    CONSTRAINT team_join_links_display_id_shape
        CHECK (display_id ~ '^tj_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE UNIQUE INDEX team_join_links_one_active_idx
    ON team_join_links (team_id)
    WHERE revoked_at IS NULL;

CREATE INDEX team_join_links_team_idx ON team_join_links (team_id);

CREATE TRIGGER team_join_links_set_updated_at BEFORE UPDATE ON team_join_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
