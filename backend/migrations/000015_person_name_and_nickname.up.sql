ALTER TABLE users ADD COLUMN first_name          text;
ALTER TABLE users ADD COLUMN middle_name         text;
ALTER TABLE users ADD COLUMN last_name           text;
ALTER TABLE users ADD COLUMN legacy_display_name text;
ALTER TABLE users ADD COLUMN nickname            text;
ALTER TABLE users ADD COLUMN profile_public      boolean NOT NULL DEFAULT false;

UPDATE users SET
    legacy_display_name = display_name,
    first_name = CASE
        WHEN array_length(regexp_split_to_array(btrim(display_name), '\s+'), 1) >= 2
            THEN (regexp_split_to_array(btrim(display_name), '\s+'))[1]
        ELSE btrim(display_name)
    END,
    middle_name = CASE
        WHEN array_length(regexp_split_to_array(btrim(display_name), '\s+'), 1) >= 3
            THEN array_to_string(
                (regexp_split_to_array(btrim(display_name), '\s+'))[2:
                    array_length(regexp_split_to_array(btrim(display_name), '\s+'), 1) - 1], ' ')
        ELSE NULL
    END,
    last_name = CASE
        WHEN array_length(regexp_split_to_array(btrim(display_name), '\s+'), 1) >= 2
            THEN (regexp_split_to_array(btrim(display_name), '\s+'))[
                array_length(regexp_split_to_array(btrim(display_name), '\s+'), 1)]
        ELSE btrim(display_name)
    END;

ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name  SET NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_first_name_len
    CHECK (length(btrim(first_name)) BETWEEN 1 AND 80);
ALTER TABLE users ADD CONSTRAINT users_middle_name_len
    CHECK (middle_name IS NULL OR length(btrim(middle_name)) BETWEEN 1 AND 80);
ALTER TABLE users ADD CONSTRAINT users_last_name_len
    CHECK (length(btrim(last_name)) BETWEEN 1 AND 80);
ALTER TABLE users ADD CONSTRAINT users_legacy_display_name_len
    CHECK (legacy_display_name IS NULL OR length(btrim(legacy_display_name)) BETWEEN 1 AND 120);
ALTER TABLE users ADD CONSTRAINT users_nickname_format
    CHECK (nickname IS NULL OR nickname ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,37}[A-Za-z0-9]$');

CREATE UNIQUE INDEX users_nickname_key ON users (lower(nickname)) WHERE nickname IS NOT NULL;
CREATE INDEX users_last_name_search_idx ON users (lower(last_name));
CREATE INDEX users_first_name_search_idx ON users (lower(first_name));

ALTER TABLE users DROP CONSTRAINT users_display_name_len;
DROP INDEX users_display_name_search_idx;
ALTER TABLE users DROP COLUMN display_name;

CREATE TABLE nickname_reservations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname     text        NOT NULL,
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    released_at  timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT nickname_reservations_format
        CHECK (nickname ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,37}[A-Za-z0-9]$')
);

CREATE UNIQUE INDEX nickname_reservations_key ON nickname_reservations (lower(nickname));
CREATE INDEX nickname_reservations_released_idx ON nickname_reservations (released_at);

ALTER TABLE event_participants
    ADD COLUMN show_on_profile boolean NOT NULL DEFAULT false;
