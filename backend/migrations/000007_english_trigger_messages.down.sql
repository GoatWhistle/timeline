CREATE OR REPLACE FUNCTION notifications_forbid_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'удаление строк notifications запрещено: logical_key обеспечивает дедупликацию'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('app.audit_retention', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'журнал аудита неизменяем: операция % запрещена', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
