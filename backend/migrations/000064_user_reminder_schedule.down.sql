DROP TRIGGER users_seed_reminder_schedule ON users;
DROP FUNCTION seed_reminder_schedule();

ALTER TABLE users DROP COLUMN reminder_overdue_enabled;

ALTER TABLE users DROP CONSTRAINT users_reminder_schedule_version_positive;
ALTER TABLE users DROP COLUMN reminder_schedule_version;

DROP INDEX user_reminder_schedule_user_idx;
DROP TABLE user_reminder_schedule;
