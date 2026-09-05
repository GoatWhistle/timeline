ALTER TABLE users ADD COLUMN notification_channels text[] NOT NULL DEFAULT '{TELEGRAM,EMAIL}';

UPDATE users SET notification_channels = ARRAY[preferred_channel]
    WHERE preferred_channel IS NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_notification_channels_enum
    CHECK (notification_channels <@ ARRAY['TELEGRAM', 'EMAIL']::text[]);

ALTER TABLE users ADD CONSTRAINT users_notification_channels_distinct
    CHECK (array_length(notification_channels, 1) IS NULL
        OR array_length(notification_channels, 1) <= 2);

ALTER TABLE users ADD CONSTRAINT users_notification_channels_no_duplicates
    CHECK (array_length(notification_channels, 1) IS NULL
        OR array_length(notification_channels, 1) < 2
        OR notification_channels[1] IS DISTINCT FROM notification_channels[2]);

ALTER TABLE users DROP CONSTRAINT users_preferred_channel_enum;
ALTER TABLE users DROP COLUMN preferred_channel;

ALTER TABLE notification_rules DROP CONSTRAINT rules_channel_enum;
ALTER TABLE notification_rules DROP COLUMN channel_override;

CREATE TABLE notification_preferences (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    occasion   text        NOT NULL,
    channel    text        NOT NULL,
    enabled    boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, occasion, channel),
    CONSTRAINT notification_preferences_occasion_enum CHECK (occasion IN (
        'REGISTRATION_REQUIRED', 'REGISTRATION_REMINDER', 'REGISTRATION_OVERDUE')),
    CONSTRAINT notification_preferences_channel_enum CHECK (channel IN ('TELEGRAM', 'EMAIL'))
);

CREATE TRIGGER notification_preferences_set_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
