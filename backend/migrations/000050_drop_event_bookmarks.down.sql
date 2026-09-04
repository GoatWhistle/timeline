CREATE TABLE event_bookmarks (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT bookmarks_owner_event_pk PRIMARY KEY (user_id, event_id)
);

CREATE INDEX bookmarks_owner_idx ON event_bookmarks (user_id, created_at DESC);
