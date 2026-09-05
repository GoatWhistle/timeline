DROP TABLE IF EXISTS notification_preferences;

ALTER TABLE notification_rules ADD COLUMN channel_override text;

ALTER TABLE notification_rules ADD CONSTRAINT rules_channel_enum
    CHECK (channel_override IS NULL OR channel_override IN ('TELEGRAM', 'EMAIL'));

ALTER TABLE users ADD COLUMN preferred_channel text;

UPDATE users SET preferred_channel = notification_channels[1]
    WHERE notification_channels IS NOT NULL AND array_length(notification_channels, 1) = 1;

ALTER TABLE users ADD CONSTRAINT users_preferred_channel_enum
    CHECK (preferred_channel IS NULL OR preferred_channel IN ('TELEGRAM', 'EMAIL'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_notification_channels_distinct;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_notification_channels_enum;
ALTER TABLE users DROP COLUMN IF EXISTS notification_channels;
