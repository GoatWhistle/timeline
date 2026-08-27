
CREATE TABLE audit_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users (id),
    action        text        NOT NULL,
    entity_type   text        NOT NULL,
    entity_id     uuid,
    before_json   jsonb,
    after_json    jsonb,
    request_id    text,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT audit_action_len CHECK (length(action) BETWEEN 1 AND 80),
    CONSTRAINT audit_entity_type_len CHECK (length(entity_type) BETWEEN 1 AND 60)
);

CREATE INDEX audit_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX audit_entity_idx ON audit_log (entity_type, entity_id);
CREATE INDEX audit_actor_idx ON audit_log (actor_user_id);
CREATE INDEX audit_action_idx ON audit_log (action);

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('app.audit_retention', true), '') = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'the audit log is immutable: operation % is forbidden', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_guard BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

REVOKE UPDATE, DELETE ON TABLE audit_log FROM PUBLIC;
