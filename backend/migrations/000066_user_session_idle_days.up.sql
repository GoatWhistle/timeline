ALTER TABLE users ADD COLUMN session_idle_days integer DEFAULT 180;

ALTER TABLE users ADD CONSTRAINT users_session_idle_days_range
    CHECK (session_idle_days IS NULL OR session_idle_days BETWEEN 1 AND 365);

CREATE INDEX sessions_idle_sweep_idx ON sessions (user_id, coalesce(last_used_at, created_at))
    WHERE revoked_at IS NULL;
