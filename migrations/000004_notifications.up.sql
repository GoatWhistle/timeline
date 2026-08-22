-- Правила напоминаний и очередь уведомлений (раздел 9 ТЗ).

CREATE TABLE notification_rules (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id  uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    -- Знак смещения задаёт тип уведомления: >= 0 — напоминание до дедлайна,
    -- < 0 — уведомление о просрочке. Отдельного поля типа у правила нет.
    offset_minutes   integer     NOT NULL,
    enabled          boolean     NOT NULL DEFAULT true,
    -- Слот ограничивает число правил десятью декларативно: обычный CHECK
    -- не умеет считать соседние строки.
    slot_no          integer     NOT NULL,
    channel_override text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT rules_offset_range CHECK (offset_minutes BETWEEN -525600 AND 525600),
    CONSTRAINT rules_slot_range CHECK (slot_no BETWEEN 1 AND 10),
    CONSTRAINT rules_channel_enum CHECK (channel_override IS NULL OR channel_override IN ('TELEGRAM', 'EMAIL')),
    CONSTRAINT rules_registration_offset_key UNIQUE (registration_id, offset_minutes),
    CONSTRAINT rules_registration_slot_key UNIQUE (registration_id, slot_no)
);

CREATE INDEX rules_registration_enabled_idx ON notification_rules (registration_id) WHERE enabled;

CREATE TRIGGER rules_set_updated_at BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Очередь доставки. Уникальный logical_key — единственная гарантия того,
-- что одна и та же бизнес-ситуация не породит два уведомления.
CREATE TABLE notifications (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type            text        NOT NULL,
    recipient_user_id            uuid        NOT NULL REFERENCES users (id),
    registration_status_id       uuid        NOT NULL REFERENCES registration_statuses (id) ON DELETE RESTRICT,
    rule_id                      uuid REFERENCES notification_rules (id) ON DELETE RESTRICT,

    schedule_version             integer,
    todo_cycle                   integer,
    assignment_version           integer,
    activation_version           integer,
    notification_content_version integer     NOT NULL,

    logical_key                  text        NOT NULL,
    requested_channel            text        NOT NULL,
    actual_channel               text,
    failed_channels              text[]      NOT NULL DEFAULT '{}',

    status                       text        NOT NULL DEFAULT 'PENDING',
    scheduled_at                 timestamptz NOT NULL,
    next_attempt_at              timestamptz,
    attempt_count                integer     NOT NULL DEFAULT 0,
    lease_expires_at             timestamptz,
    -- Момент начала вызова провайдера: после него гарантированная отмена невозможна.
    provider_call_started_at     timestamptz,
    payload_json                 jsonb,
    last_error                   text,
    sent_at                      timestamptz,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT notifications_type_enum CHECK (notification_type IN (
        'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE')),
    CONSTRAINT notifications_status_enum CHECK (status IN (
        'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'UNDELIVERABLE')),
    CONSTRAINT notifications_requested_channel_enum CHECK (requested_channel IN ('TELEGRAM', 'EMAIL')),
    CONSTRAINT notifications_actual_channel_enum CHECK (actual_channel IS NULL OR actual_channel IN ('TELEGRAM', 'EMAIL')),
    CONSTRAINT notifications_content_version_positive CHECK (notification_content_version >= 1),
    CONSTRAINT notifications_attempt_count_range CHECK (attempt_count BETWEEN 0 AND 4),
    CONSTRAINT notifications_versions_positive CHECK (
        (schedule_version IS NULL OR schedule_version >= 1) AND
        (todo_cycle IS NULL OR todo_cycle >= 1) AND
        (assignment_version IS NULL OR assignment_version >= 1) AND
        (activation_version IS NULL OR activation_version >= 1)),

    -- Набор обязательных версий определяется типом уведомления (раздел 9.2 ТЗ).
    CONSTRAINT notifications_versions_by_type CHECK (
        CASE notification_type
            WHEN 'REGISTRATION_REQUIRED' THEN
                rule_id IS NULL AND assignment_version IS NOT NULL AND activation_version IS NOT NULL
            ELSE
                rule_id IS NOT NULL AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
        END),

    CONSTRAINT notifications_logical_key_key UNIQUE (logical_key)
);

CREATE INDEX notifications_due_idx ON notifications (next_attempt_at) WHERE status = 'PENDING';
CREATE INDEX notifications_lease_idx ON notifications (lease_expires_at) WHERE status = 'PROCESSING';
CREATE INDEX notifications_status_idx ON notifications (registration_status_id, status);
CREATE INDEX notifications_recipient_idx ON notifications (recipient_user_id, status);
CREATE INDEX notifications_retention_idx ON notifications (created_at) WHERE payload_json IS NOT NULL;

CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Строку уведомления удалять нельзя: без logical_key согласование пересоздаст
-- уже отправленное уведомление для статуса, оставшегося в TODO. Очистка по сроку
-- хранения обнуляет только payload_json.
CREATE OR REPLACE FUNCTION notifications_forbid_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'удаление строк notifications запрещено: logical_key обеспечивает дедупликацию'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_no_delete BEFORE DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION notifications_forbid_delete();
