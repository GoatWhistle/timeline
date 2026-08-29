ALTER TABLE users DROP CONSTRAINT IF EXISTS users_shortcuts_size;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_shortcuts_object;

ALTER TABLE users DROP COLUMN IF EXISTS shortcuts;
