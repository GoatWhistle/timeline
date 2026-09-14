CREATE TABLE user_reminder_schedule (
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    occasion    text        NOT NULL,
    days_before integer     NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT user_reminder_schedule_pkey PRIMARY KEY (user_id, occasion, days_before),
    CONSTRAINT user_reminder_schedule_occasion_enum CHECK (occasion IN (
        'REMINDER_REGISTRATION_DEADLINE', 'REMINDER_EVENT_START',
        'REMINDER_STAGE_START', 'REMINDER_EVENT_END')),
    CONSTRAINT user_reminder_schedule_days_enum CHECK (days_before IN (1, 2, 3, 7, 14))
);

CREATE INDEX user_reminder_schedule_user_idx ON user_reminder_schedule (user_id);

ALTER TABLE users ADD COLUMN reminder_schedule_version integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD CONSTRAINT users_reminder_schedule_version_positive
    CHECK (reminder_schedule_version >= 1);

ALTER TABLE users ADD COLUMN reminder_overdue_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION seed_reminder_schedule() RETURNS trigger AS $$
BEGIN
    INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
    VALUES
        (NEW.id, 'REMINDER_REGISTRATION_DEADLINE', 1),
        (NEW.id, 'REMINDER_REGISTRATION_DEADLINE', 3),
        (NEW.id, 'REMINDER_EVENT_START', 1),
        (NEW.id, 'REMINDER_STAGE_START', 1)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_seed_reminder_schedule AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION seed_reminder_schedule();

INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
SELECT u.id, d.occasion, d.days_before
FROM users u
CROSS JOIN (VALUES
    ('REMINDER_REGISTRATION_DEADLINE', 1),
    ('REMINDER_REGISTRATION_DEADLINE', 3),
    ('REMINDER_EVENT_START', 1),
    ('REMINDER_STAGE_START', 1)
) AS d (occasion, days_before)
ON CONFLICT DO NOTHING;
