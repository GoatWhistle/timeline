DROP INDEX sessions_idle_sweep_idx;

ALTER TABLE users DROP CONSTRAINT users_session_idle_days_range;
ALTER TABLE users DROP COLUMN session_idle_days;
