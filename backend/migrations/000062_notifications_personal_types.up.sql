ALTER TABLE notifications DROP CONSTRAINT notifications_type_enum;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_enum CHECK (notification_type IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));

ALTER TABLE notifications ALTER COLUMN registration_status_id DROP NOT NULL;

DROP INDEX notifications_status_idx;
CREATE INDEX notifications_status_idx ON notifications (registration_status_id, status)
    WHERE registration_status_id IS NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT notifications_versions_by_type;
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

CREATE INDEX notifications_personal_recipient_idx ON notifications (recipient_user_id, notification_type)
    WHERE registration_status_id IS NULL;

ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_occasion_enum;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_occasion_enum CHECK (occasion IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE',
    'WEEKLY_DIGEST', 'PERSONAL_TASK_DUE', 'PERSONAL_RETROSPECTIVE_DUE'));
