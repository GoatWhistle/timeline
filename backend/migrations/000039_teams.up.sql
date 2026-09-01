CREATE TABLE teams (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id   text        NOT NULL DEFAULT display_id('tm'),
    name         text        NOT NULL,
    lead_user_id uuid        NOT NULL REFERENCES users (id),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT teams_name_len CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    CONSTRAINT teams_display_id_key UNIQUE (display_id),
    CONSTRAINT teams_display_id_shape
        CHECK (display_id ~ '^tm_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX teams_lead_idx ON teams (lead_user_id);

CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE team_members (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id   text        NOT NULL DEFAULT display_id('tb'),
    team_id      uuid        NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users (id),
    state        text        NOT NULL DEFAULT 'INVITED',
    invited_at   timestamptz NOT NULL DEFAULT now(),
    joined_at    timestamptz,
    left_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT team_members_state_enum CHECK (state IN ('INVITED', 'ACTIVE', 'LEFT')),
    CONSTRAINT team_members_invited_consistency CHECK (
        state <> 'INVITED' OR joined_at IS NULL),
    CONSTRAINT team_members_active_consistency CHECK (
        state <> 'ACTIVE' OR joined_at IS NOT NULL),
    CONSTRAINT team_members_left_consistency CHECK (
        (state = 'LEFT') = (left_at IS NOT NULL)),
    CONSTRAINT team_members_team_user_key UNIQUE (team_id, user_id),
    CONSTRAINT team_members_id_team_key UNIQUE (id, team_id),
    CONSTRAINT team_members_display_id_key UNIQUE (display_id),
    CONSTRAINT team_members_display_id_shape
        CHECK (display_id ~ '^tb_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX team_members_user_idx ON team_members (user_id) WHERE state = 'ACTIVE';
CREATE INDEX team_members_team_idx ON team_members (team_id, state);

CREATE TRIGGER team_members_set_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE team_event_entries (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id text        NOT NULL DEFAULT display_id('te'),
    team_id    uuid        NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    entered_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT team_event_entries_team_event_key UNIQUE (team_id, event_id),
    CONSTRAINT team_event_entries_display_id_key UNIQUE (display_id),
    CONSTRAINT team_event_entries_display_id_shape
        CHECK (display_id ~ '^te_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX team_event_entries_event_idx ON team_event_entries (event_id);

CREATE TRIGGER team_event_entries_set_updated_at BEFORE UPDATE ON team_event_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
