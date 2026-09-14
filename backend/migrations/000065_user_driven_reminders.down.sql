ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_occasion_enum;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_occasion_enum CHECK (occasion IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));

CREATE TABLE notification_rules (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id       text        NOT NULL DEFAULT display_id('nr'),
    registration_id  uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    offset_minutes   integer     NOT NULL,
    enabled          boolean     NOT NULL DEFAULT true,
    slot_no          integer     NOT NULL,
    channel_override text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT rules_offset_range CHECK (offset_minutes BETWEEN -525600 AND 525600),
    CONSTRAINT rules_slot_range CHECK (slot_no BETWEEN 1 AND 10),
    CONSTRAINT rules_channel_enum CHECK (channel_override IS NULL OR channel_override IN ('TELEGRAM', 'EMAIL')),
    CONSTRAINT rules_registration_offset_key UNIQUE (registration_id, offset_minutes),
    CONSTRAINT rules_registration_slot_key UNIQUE (registration_id, slot_no),
    CONSTRAINT notification_rules_display_id_key UNIQUE (display_id),
    CONSTRAINT notification_rules_display_id_shape
        CHECK (display_id ~ '^nr_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE INDEX rules_registration_enabled_idx ON notification_rules (registration_id) WHERE enabled;

CREATE TRIGGER rules_set_updated_at BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP INDEX notifications_event_reminder_idx;

ALTER TABLE notifications DROP CONSTRAINT notifications_versions_by_type;
ALTER TABLE notifications DROP CONSTRAINT notifications_reminder_schedule_version_positive;
ALTER TABLE notifications DROP CONSTRAINT notifications_reminder_days_enum;

UPDATE notifications SET status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL
WHERE notification_type IN ('REMINDER_REGISTRATION_DEADLINE', 'REMINDER_EVENT_START',
    'REMINDER_STAGE_START', 'REMINDER_EVENT_END', 'REGISTRATION_OVERDUE')
  AND (status = 'PENDING' OR status = 'PROCESSING');

DROP TRIGGER notifications_no_delete ON notifications;

DELETE FROM notifications
WHERE notification_type IN ('REMINDER_EVENT_START', 'REMINDER_STAGE_START', 'REMINDER_EVENT_END');

CREATE TRIGGER notifications_no_delete BEFORE DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION notifications_forbid_delete();

UPDATE notifications SET notification_type = 'REGISTRATION_REMINDER'
WHERE notification_type = 'REMINDER_REGISTRATION_DEADLINE';

ALTER TABLE notifications DROP COLUMN reminder_schedule_version;
ALTER TABLE notifications DROP COLUMN reminder_days_before;
ALTER TABLE notifications DROP COLUMN stage_id;
ALTER TABLE notifications DROP COLUMN event_id;

ALTER TABLE notifications ADD COLUMN rule_id uuid REFERENCES notification_rules (id) ON DELETE RESTRICT;

ALTER TABLE notifications ADD CONSTRAINT notifications_versions_by_type CHECK (
    CASE notification_type
        WHEN 'REGISTRATION_REQUIRED' THEN
            registration_status_id IS NOT NULL AND rule_id IS NULL
                AND assignment_version IS NOT NULL AND activation_version IS NOT NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
        WHEN 'REGISTRATION_REMINDER' THEN
            registration_status_id IS NOT NULL AND rule_id IS NOT NULL
                AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
                AND assignment_version IS NULL AND activation_version IS NULL
        WHEN 'REGISTRATION_OVERDUE' THEN
            registration_status_id IS NOT NULL AND rule_id IS NOT NULL
                AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
                AND assignment_version IS NULL AND activation_version IS NULL
        ELSE
            registration_status_id IS NULL AND rule_id IS NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND assignment_version IS NULL AND activation_version IS NULL
    END);

ALTER TABLE notifications DROP CONSTRAINT notifications_type_enum;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_enum CHECK (notification_type IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));
