CREATE TABLE calendar_feed_tokens (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at   timestamptz,

    CONSTRAINT calendar_feed_tokens_hash_unique UNIQUE (token_hash),
    CONSTRAINT calendar_feed_tokens_hash_len CHECK (length(token_hash) BETWEEN 32 AND 128)
);

CREATE UNIQUE INDEX calendar_feed_tokens_one_active_idx
    ON calendar_feed_tokens (user_id)
    WHERE revoked_at IS NULL;

CREATE INDEX calendar_feed_tokens_user_idx ON calendar_feed_tokens (user_id);
