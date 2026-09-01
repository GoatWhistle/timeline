ALTER TABLE team_event_entries ADD CONSTRAINT team_event_entries_id_team_key UNIQUE (id, team_id);

CREATE TABLE team_event_participants (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id text        NOT NULL DEFAULT display_id('tp'),
    entry_id   uuid        NOT NULL REFERENCES team_event_entries (id) ON DELETE CASCADE,
    member_id  uuid        NOT NULL REFERENCES team_members (id) ON DELETE CASCADE,
    team_id    uuid        NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    added_at   timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT team_event_participants_entry_member_key UNIQUE (entry_id, member_id),
    CONSTRAINT team_event_participants_display_id_key UNIQUE (display_id),
    CONSTRAINT team_event_participants_display_id_shape
        CHECK (display_id ~ '^tp_[23456789abcdefghjkmnpqrstuvwxyz]{12}$'),

    CONSTRAINT team_event_participants_entry_team_fk FOREIGN KEY (entry_id, team_id)
        REFERENCES team_event_entries (id, team_id) ON DELETE CASCADE,
    CONSTRAINT team_event_participants_member_team_fk FOREIGN KEY (member_id, team_id)
        REFERENCES team_members (id, team_id) ON DELETE CASCADE
);

CREATE INDEX team_event_participants_entry_idx ON team_event_participants (entry_id);
CREATE INDEX team_event_participants_member_idx ON team_event_participants (member_id);

CREATE TRIGGER team_event_participants_set_updated_at BEFORE UPDATE ON team_event_participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION team_event_participants_require_active() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM team_members
        WHERE id = NEW.member_id AND state = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'only an active team member can be placed on an event roster'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_event_participants_active_guard
    BEFORE INSERT OR UPDATE ON team_event_participants
    FOR EACH ROW EXECUTE FUNCTION team_event_participants_require_active();

CREATE OR REPLACE FUNCTION team_members_clear_rosters() RETURNS trigger AS $$
BEGIN
    IF NEW.state <> 'ACTIVE' AND OLD.state = 'ACTIVE' THEN
        DELETE FROM team_event_participants WHERE member_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_roster_cleanup AFTER UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION team_members_clear_rosters();
