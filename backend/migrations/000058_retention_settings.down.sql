DROP TRIGGER IF EXISTS events_purge_requires_archived_guard ON events;
DROP FUNCTION IF EXISTS events_purge_requires_archived();
DROP INDEX IF EXISTS events_purge_scheduled_at_idx;
ALTER TABLE events DROP COLUMN IF EXISTS purge_scheduled_at;
DROP TABLE IF EXISTS retention_settings;
