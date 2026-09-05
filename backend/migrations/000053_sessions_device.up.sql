ALTER TABLE sessions ADD COLUMN device_hash text;

ALTER TABLE sessions ADD CONSTRAINT sessions_device_hash_shape
    CHECK (device_hash IS NULL OR device_hash ~ '^[0-9a-f]{64}$');

CREATE INDEX sessions_device_idx ON sessions (user_id, device_hash)
    WHERE device_hash IS NOT NULL;
