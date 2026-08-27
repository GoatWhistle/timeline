CREATE OR REPLACE FUNCTION notifications_forbid_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'deleting notifications rows is forbidden: logical_key guarantees deduplication'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('app.audit_retention', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'the audit log is immutable: operation % is forbidden', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
