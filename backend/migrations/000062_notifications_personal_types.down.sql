ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_occasion_enum;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_occasion_enum CHECK (occasion IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE'));

DROP INDEX notifications_personal_recipient_idx;

ALTER TABLE notifications DROP CONSTRAINT notifications_versions_by_type;
ALTER TABLE notifications ADD CONSTRAINT notifications_versions_by_type CHECK (
    CASE notification_type
        WHEN 'REGISTRATION_REQUIRED' THEN
            rule_id IS NULL AND assignment_version IS NOT NULL AND activation_version IS NOT NULL
        ELSE
            rule_id IS NOT NULL AND schedule_version IS NOT NULL AND todo_cycle IS NOT NULL
    END);

DROP INDEX notifications_status_idx;
CREATE INDEX notifications_status_idx ON notifications (registration_status_id, status);

ALTER TABLE notifications ALTER COLUMN registration_status_id SET NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT notifications_type_enum;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_enum CHECK (notification_type IN (
    'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE'));
