
CREATE TABLE event_participants (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id              uuid        NOT NULL REFERENCES users (id),
    team_role            text,
    participation_status text        NOT NULL DEFAULT 'ASSIGNED',
    assignment_version   integer     NOT NULL DEFAULT 1,
    assigned_at          timestamptz NOT NULL DEFAULT now(),
    removed_at           timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT participants_team_role_len CHECK (
        team_role IS NULL OR length(btrim(team_role)) BETWEEN 1 AND 80),
    CONSTRAINT participants_status_enum CHECK (participation_status IN ('ASSIGNED', 'REMOVED')),
    CONSTRAINT participants_assignment_version_positive CHECK (assignment_version >= 1),
    CONSTRAINT participants_removed_consistency CHECK (
        (participation_status = 'REMOVED') = (removed_at IS NOT NULL)),

    CONSTRAINT participants_event_user_key UNIQUE (event_id, user_id),
    CONSTRAINT participants_id_event_key UNIQUE (id, event_id)
);

CREATE INDEX participants_user_assigned_idx ON event_participants (user_id)
    WHERE participation_status = 'ASSIGNED';
CREATE INDEX participants_event_role_idx ON event_participants (event_id, team_role);

CREATE TRIGGER participants_set_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE registrations (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                     uuid        NOT NULL,
    url                          text        NOT NULL,
    deadline_at                  timestamptz NOT NULL,
    event_end_at                 timestamptz NOT NULL,
    description                  text,
    state                        text        NOT NULL DEFAULT 'ACTIVE',
    schedule_version             integer     NOT NULL DEFAULT 1,
    activation_version           integer     NOT NULL DEFAULT 1,
    notification_content_version integer     NOT NULL DEFAULT 1,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT registrations_url_https CHECK (url ~ '^https://'),
    CONSTRAINT registrations_state_enum CHECK (state IN ('ACTIVE', 'DISABLED')),
    CONSTRAINT registrations_schedule_version_positive CHECK (schedule_version >= 1),
    CONSTRAINT registrations_activation_version_positive CHECK (activation_version >= 1),
    CONSTRAINT registrations_content_version_positive CHECK (notification_content_version >= 1),

    CONSTRAINT registrations_deadline_within_event CHECK (deadline_at <= event_end_at),
    CONSTRAINT registrations_event_key UNIQUE (event_id),
    CONSTRAINT registrations_id_event_key UNIQUE (id, event_id),
    CONSTRAINT registrations_event_end_fk FOREIGN KEY (event_id, event_end_at)
        REFERENCES events (id, end_at) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX registrations_active_deadline_idx ON registrations (deadline_at) WHERE state = 'ACTIVE';

CREATE TRIGGER registrations_set_updated_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE registration_statuses (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                uuid        NOT NULL,
    registration_id         uuid        NOT NULL,
    participant_id          uuid        NOT NULL,
    status                  text        NOT NULL DEFAULT 'TODO',
    todo_cycle              integer     NOT NULL DEFAULT 1,
    registered_at           timestamptz,
    last_change_source      text        NOT NULL DEFAULT 'SYSTEM',
    last_changed_by_user_id uuid REFERENCES users (id),
    note                    text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT statuses_status_enum CHECK (status IN ('TODO', 'DONE', 'NOT_REQUIRED')),
    CONSTRAINT statuses_source_enum CHECK (last_change_source IN ('SYSTEM', 'USER', 'ADMIN')),
    CONSTRAINT statuses_todo_cycle_positive CHECK (todo_cycle >= 1),
    CONSTRAINT statuses_registered_at_only_done CHECK (status = 'DONE' OR registered_at IS NULL),
    CONSTRAINT statuses_registration_participant_key UNIQUE (registration_id, participant_id),
    CONSTRAINT statuses_registration_fk FOREIGN KEY (registration_id, event_id)
        REFERENCES registrations (id, event_id) ON DELETE CASCADE,
    CONSTRAINT statuses_participant_fk FOREIGN KEY (participant_id, event_id)
        REFERENCES event_participants (id, event_id) ON DELETE CASCADE
);

CREATE INDEX statuses_registration_status_idx ON registration_statuses (registration_id, status);
CREATE INDEX statuses_participant_idx ON registration_statuses (participant_id);
CREATE INDEX statuses_todo_idx ON registration_statuses (event_id) WHERE status = 'TODO';

CREATE TRIGGER statuses_set_updated_at BEFORE UPDATE ON registration_statuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
