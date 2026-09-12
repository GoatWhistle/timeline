CREATE TABLE retention_settings (
    id                          smallint    PRIMARY KEY DEFAULT 1,
    archive_after_days          integer,
    delete_archive_after_months integer,
    delete_covers_on_archive    boolean     NOT NULL DEFAULT false,
    audit_log_retention_days    integer     NOT NULL DEFAULT 365,
    updated_by                  uuid        REFERENCES users (id),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT retention_settings_singleton CHECK (id = 1),
    CONSTRAINT retention_settings_archive_after_days_range
        CHECK (archive_after_days IS NULL OR archive_after_days BETWEEN 1 AND 3650),
    CONSTRAINT retention_settings_delete_archive_after_months_range
        CHECK (delete_archive_after_months IS NULL OR delete_archive_after_months BETWEEN 1 AND 600),
    CONSTRAINT retention_settings_audit_log_retention_days_range
        CHECK (audit_log_retention_days BETWEEN 1 AND 3650)
);

INSERT INTO retention_settings (id) VALUES (1);

ALTER TABLE events ADD COLUMN purge_scheduled_at timestamptz;

CREATE INDEX events_purge_scheduled_at_idx ON events (purge_scheduled_at)
    WHERE purge_scheduled_at IS NOT NULL;

CREATE OR REPLACE FUNCTION events_purge_requires_archived() RETURNS trigger AS $$
BEGIN
    IF NEW.purge_scheduled_at IS NOT NULL AND NEW.archived_at IS NULL THEN
        RAISE EXCEPTION 'purge_scheduled_at requires an archived event'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_purge_requires_archived_guard BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION events_purge_requires_archived();
