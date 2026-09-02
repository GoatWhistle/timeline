UPDATE users
SET nickname = display_id
WHERE nickname IS NULL
  AND deleted_at IS NULL
  AND display_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,37}[A-Za-z0-9]$';

CREATE INDEX nickname_reservations_user_idx ON nickname_reservations (user_id);
