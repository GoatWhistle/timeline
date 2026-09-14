ALTER TABLE notifications DROP CONSTRAINT notifications_type_enum;

ALTER TABLE notifications DROP CONSTRAINT notifications_versions_by_type;

UPDATE notifications SET status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL
WHERE notification_type = 'REGISTRATION_REMINDER'
  AND (status = 'PENDING' OR status = 'PROCESSING');

UPDATE notifications SET notification_type = 'REMINDER_REGISTRATION_DEADLINE'
WHERE notification_type = 'REGISTRATION_REMINDER';

ALTER TABLE notifications ADD CONSTRAINT notifications_type_enum CHECK (notification_type IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_OVERDUE',
    'REMINDER_REGISTRATION_DEADLINE', 'REMINDER_EVENT_START',
    'REMINDER_STAGE_START', 'REMINDER_EVENT_END',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));

UPDATE notifications SET rule_id = NULL WHERE rule_id IS NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT notifications_rule_id_fkey;
ALTER TABLE notifications DROP COLUMN rule_id;

ALTER TABLE notifications ADD COLUMN event_id uuid REFERENCES events (id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN stage_id uuid REFERENCES stages (id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN reminder_days_before integer;
ALTER TABLE notifications ADD COLUMN reminder_schedule_version integer;

ALTER TABLE notifications ADD CONSTRAINT notifications_reminder_days_enum
    CHECK (reminder_days_before IS NULL OR reminder_days_before IN (1, 2, 3, 7, 14));
ALTER TABLE notifications ADD CONSTRAINT notifications_reminder_schedule_version_positive
    CHECK (reminder_schedule_version IS NULL OR reminder_schedule_version >= 1);

UPDATE notifications SET reminder_schedule_version = 1
WHERE notification_type IN ('REMINDER_REGISTRATION_DEADLINE', 'REGISTRATION_OVERDUE')
  AND reminder_schedule_version IS NULL;

UPDATE notifications SET reminder_days_before = 1
WHERE notification_type = 'REMINDER_REGISTRATION_DEADLINE'
  AND reminder_days_before IS NULL;

ALTER TABLE notifications ADD CONSTRAINT notifications_versions_by_type CHECK (
    CASE notification_type
        WHEN 'REGISTRATION_REQUIRED' THEN
            registration_status_id IS NOT NULL
                AND assignment_version IS NOT NULL AND activation_version IS NOT NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND reminder_days_before IS NULL AND reminder_schedule_version IS NULL
                AND event_id IS NULL AND stage_id IS NULL
        WHEN 'REGISTRATION_OVERDUE' THEN
            registration_status_id IS NOT NULL
                AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
                AND assignment_version IS NULL AND activation_version IS NULL
                AND reminder_days_before IS NULL AND reminder_schedule_version IS NOT NULL
                AND event_id IS NULL AND stage_id IS NULL
        WHEN 'REMINDER_REGISTRATION_DEADLINE' THEN
            registration_status_id IS NOT NULL
                AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
                AND assignment_version IS NULL AND activation_version IS NULL
                AND reminder_days_before IS NOT NULL AND reminder_schedule_version IS NOT NULL
                AND event_id IS NULL AND stage_id IS NULL
        WHEN 'REMINDER_EVENT_START' THEN
            registration_status_id IS NULL AND event_id IS NOT NULL AND stage_id IS NULL
                AND reminder_days_before IS NOT NULL AND reminder_schedule_version IS NOT NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND assignment_version IS NULL AND activation_version IS NULL
        WHEN 'REMINDER_EVENT_END' THEN
            registration_status_id IS NULL AND event_id IS NOT NULL AND stage_id IS NULL
                AND reminder_days_before IS NOT NULL AND reminder_schedule_version IS NOT NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND assignment_version IS NULL AND activation_version IS NULL
        WHEN 'REMINDER_STAGE_START' THEN
            registration_status_id IS NULL AND event_id IS NOT NULL AND stage_id IS NOT NULL
                AND reminder_days_before IS NOT NULL AND reminder_schedule_version IS NOT NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND assignment_version IS NULL AND activation_version IS NULL
        ELSE
            registration_status_id IS NULL
                AND schedule_version IS NULL AND todo_cycle IS NULL
                AND assignment_version IS NULL AND activation_version IS NULL
                AND reminder_days_before IS NULL AND reminder_schedule_version IS NULL
                AND event_id IS NULL AND stage_id IS NULL
    END);

CREATE INDEX notifications_event_reminder_idx ON notifications (event_id, notification_type)
    WHERE event_id IS NOT NULL;

DROP TABLE notification_rules;

DELETE FROM notification_preferences WHERE occasion = 'REGISTRATION_REMINDER';

ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_occasion_enum;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_occasion_enum CHECK (occasion IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_OVERDUE',
    'REMINDER_REGISTRATION_DEADLINE', 'REMINDER_EVENT_START',
    'REMINDER_STAGE_START', 'REMINDER_EVENT_END',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));
