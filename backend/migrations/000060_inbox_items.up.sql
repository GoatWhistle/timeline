CREATE TABLE inbox_items (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id     text        NOT NULL DEFAULT display_id('ib'),
    recipient_user_id uuid     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind           text        NOT NULL,
    title          text        NOT NULL,
    body_md        text        NOT NULL,
    subject_type   text,
    subject_id     uuid,
    actions_json   jsonb       NOT NULL DEFAULT '[]'::jsonb,
    logical_key    text        NOT NULL,
    read_at        timestamptz,
    deleted_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT inbox_items_display_id_key UNIQUE (display_id),
    CONSTRAINT inbox_items_display_id_shape
        CHECK (display_id ~ '^ib_[23456789abcdefghjkmnpqrstuvwxyz]{12}$'),
    CONSTRAINT inbox_items_kind_len CHECK (length(btrim(kind)) BETWEEN 1 AND 64),
    CONSTRAINT inbox_items_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 300),
    CONSTRAINT inbox_items_subject_pair CHECK ((subject_type IS NULL) = (subject_id IS NULL)),
    CONSTRAINT inbox_items_logical_key_len CHECK (length(btrim(logical_key)) BETWEEN 1 AND 200),
    CONSTRAINT inbox_items_logical_key_key UNIQUE (recipient_user_id, logical_key)
);

CREATE INDEX inbox_items_recipient_idx ON inbox_items (recipient_user_id, created_at DESC, id)
    WHERE deleted_at IS NULL;
CREATE INDEX inbox_items_recipient_unread_idx ON inbox_items (recipient_user_id)
    WHERE deleted_at IS NULL AND read_at IS NULL;
CREATE INDEX inbox_items_retention_idx ON inbox_items (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER inbox_items_set_updated_at BEFORE UPDATE ON inbox_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
