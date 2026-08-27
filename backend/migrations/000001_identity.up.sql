
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name      text        NOT NULL,
    email             text        NOT NULL,
    pending_email     text,
    password_hash     text        NOT NULL,
    email_verified_at timestamptz,
    telegram_username text,
    telegram_chat_id  text,
    preferred_channel text,
    is_admin          boolean     NOT NULL DEFAULT false,
    is_active         boolean     NOT NULL DEFAULT true,
    deleted_at        timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT users_display_name_len CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
    CONSTRAINT users_email_len CHECK (length(email) BETWEEN 3 AND 254),
    CONSTRAINT users_email_normalized CHECK (email = lower(email)),
    CONSTRAINT users_pending_email_len CHECK (pending_email IS NULL OR length(pending_email) BETWEEN 3 AND 254),
    CONSTRAINT users_pending_email_normalized CHECK (pending_email IS NULL OR pending_email = lower(pending_email)),
    CONSTRAINT users_pending_email_differs CHECK (pending_email IS NULL OR pending_email <> email),
    CONSTRAINT users_telegram_username_len CHECK (telegram_username IS NULL OR length(telegram_username) <= 64),
    CONSTRAINT users_preferred_channel_enum CHECK (preferred_channel IS NULL OR preferred_channel IN ('TELEGRAM', 'EMAIL'))
);

CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE UNIQUE INDEX users_pending_email_key ON users (pending_email) WHERE pending_email IS NOT NULL;
CREATE UNIQUE INDEX users_telegram_chat_id_key ON users (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX users_display_name_search_idx ON users (lower(display_name));

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id          uuid        NOT NULL,
    refresh_token_hash text        NOT NULL,
    user_agent         text,
    ip                 text,
    expires_at         timestamptz NOT NULL,
    last_used_at       timestamptz,
    revoked_at         timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sessions_refresh_token_hash_key ON sessions (refresh_token_hash);
CREATE INDEX sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_family_idx ON sessions (family_id);

CREATE TABLE one_time_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES users (id) ON DELETE CASCADE,
    purpose      text        NOT NULL,
    token_hash   text        NOT NULL,
    target_email text,
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT one_time_tokens_purpose_enum CHECK (
        purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'TELEGRAM_LINK')),
    CONSTRAINT one_time_tokens_target_normalized CHECK (target_email IS NULL OR target_email = lower(target_email))
);

CREATE UNIQUE INDEX one_time_tokens_token_hash_key ON one_time_tokens (token_hash);
CREATE INDEX one_time_tokens_user_purpose_idx ON one_time_tokens (user_id, purpose) WHERE consumed_at IS NULL;

CREATE TABLE invites (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_email   text        NOT NULL,
    created_by_user_id uuid        NOT NULL REFERENCES users (id),
    token_hash         text        NOT NULL,
    expires_at         timestamptz NOT NULL,
    accepted_at        timestamptz,
    revoked_at         timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT invites_email_normalized CHECK (normalized_email = lower(normalized_email)),
    CONSTRAINT invites_not_accepted_and_revoked CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX invites_token_hash_key ON invites (token_hash);

CREATE UNIQUE INDEX invites_one_pending_per_email_key ON invites (normalized_email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;
