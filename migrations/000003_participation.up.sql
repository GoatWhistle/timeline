-- Участие, регистрация и статусы регистрации (разделы 6, 7, 8 ТЗ).

CREATE TABLE hackathon_participants (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id         uuid        NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
    user_id              uuid        NOT NULL REFERENCES users (id),
    team_role            text        NOT NULL,
    participation_status text        NOT NULL DEFAULT 'ASSIGNED',
    assignment_version   integer     NOT NULL DEFAULT 1,
    assigned_at          timestamptz NOT NULL DEFAULT now(),
    removed_at           timestamptz,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT participants_team_role_len CHECK (length(btrim(team_role)) BETWEEN 1 AND 80),
    CONSTRAINT participants_status_enum CHECK (participation_status IN ('ASSIGNED', 'REMOVED')),
    CONSTRAINT participants_assignment_version_positive CHECK (assignment_version >= 1),
    CONSTRAINT participants_removed_consistency CHECK (
        (participation_status = 'REMOVED') = (removed_at IS NOT NULL)),

    -- Одна логическая запись на пару: повторное добавление реактивирует существующую.
    CONSTRAINT participants_hackathon_user_key UNIQUE (hackathon_id, user_id),
    -- Ключ нужен составному внешнему ключу статуса регистрации.
    CONSTRAINT participants_id_hackathon_key UNIQUE (id, hackathon_id)
);

CREATE INDEX participants_user_assigned_idx ON hackathon_participants (user_id)
    WHERE participation_status = 'ASSIGNED';
CREATE INDEX participants_hackathon_role_idx ON hackathon_participants (hackathon_id, team_role);

CREATE TRIGGER participants_set_updated_at BEFORE UPDATE ON hackathon_participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- У хакатона не более одной логической регистрации.
CREATE TABLE registrations (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id                 uuid        NOT NULL,
    url                          text        NOT NULL,
    deadline_at                  timestamptz NOT NULL,
    -- Денормализованная копия hackathons.end_at. Поддерживается составным внешним
    -- ключом с ON UPDATE CASCADE и приложением напрямую не изменяется.
    hackathon_end_at             timestamptz NOT NULL,
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

    -- Правило deadline_at <= hackathons.end_at выражается денормализацией:
    -- обычный CHECK не видит соседнюю таблицу.
    CONSTRAINT registrations_deadline_within_hackathon CHECK (deadline_at <= hackathon_end_at),
    CONSTRAINT registrations_hackathon_key UNIQUE (hackathon_id),
    CONSTRAINT registrations_id_hackathon_key UNIQUE (id, hackathon_id),
    CONSTRAINT registrations_hackathon_end_fk FOREIGN KEY (hackathon_id, hackathon_end_at)
        REFERENCES hackathons (id, end_at) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX registrations_active_deadline_idx ON registrations (deadline_at) WHERE state = 'ACTIVE';

CREATE TRIGGER registrations_set_updated_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Статус обязан связывать регистрацию и участника одного хакатона. hackathon_id
-- хранится намеренно: он несёт межхакатонную целостность двумя составными
-- внешними ключами, а не выводится приложением.
CREATE TABLE registration_statuses (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id            uuid        NOT NULL,
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
    CONSTRAINT statuses_registration_fk FOREIGN KEY (registration_id, hackathon_id)
        REFERENCES registrations (id, hackathon_id) ON DELETE CASCADE,
    CONSTRAINT statuses_participant_fk FOREIGN KEY (participant_id, hackathon_id)
        REFERENCES hackathon_participants (id, hackathon_id) ON DELETE CASCADE
);

CREATE INDEX statuses_registration_status_idx ON registration_statuses (registration_id, status);
CREATE INDEX statuses_participant_idx ON registration_statuses (participant_id);
CREATE INDEX statuses_todo_idx ON registration_statuses (hackathon_id) WHERE status = 'TODO';

CREATE TRIGGER statuses_set_updated_at BEFORE UPDATE ON registration_statuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
