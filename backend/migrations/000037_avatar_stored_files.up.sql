UPDATE users SET avatar_url = NULL
WHERE avatar_url IS NOT NULL AND avatar_url NOT LIKE '/api/v1/avatars/%';

ALTER TABLE users ADD CONSTRAINT users_avatar_url_stored
    CHECK (avatar_url IS NULL OR avatar_url LIKE '/api/v1/avatars/%');
