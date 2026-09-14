CREATE TABLE invites (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_email   text        NOT NULL,
    created_by_user_id uuid        NOT NULL REFERENCES users (id),
    token_hash         text        NOT NULL,
    expires_at         timestamptz NOT NULL,
    accepted_at        timestamptz,
    revoked_at         timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    display_id         text        NOT NULL DEFAULT display_id('in'),

    CONSTRAINT invites_email_normalized CHECK (normalized_email = lower(normalized_email)),
    CONSTRAINT invites_not_accepted_and_revoked CHECK (accepted_at IS NULL OR revoked_at IS NULL),
    CONSTRAINT invites_display_id_shape
        CHECK (display_id ~ '^in_[23456789abcdefghjkmnpqrstuvwxyz]{12}$')
);

CREATE UNIQUE INDEX invites_token_hash_key ON invites (token_hash);

CREATE UNIQUE INDEX invites_one_pending_per_email_key ON invites (normalized_email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX invites_display_id_key ON invites (display_id);
