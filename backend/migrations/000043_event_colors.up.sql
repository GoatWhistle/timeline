ALTER TABLE events
    ADD COLUMN color_slot smallint,
    ADD COLUMN color_assigned_at timestamptz;

ALTER TABLE events ADD CONSTRAINT events_color_slot_range
    CHECK (color_slot IS NULL OR color_slot BETWEEN 0 AND 11);

ALTER TABLE events ADD CONSTRAINT events_color_slot_stamped
    CHECK ((color_slot IS NULL) = (color_assigned_at IS NULL));

CREATE UNIQUE INDEX events_color_slot_live_key
    ON events (origin, color_slot)
    WHERE color_slot IS NOT NULL AND archived_at IS NULL;

CREATE INDEX events_color_slot_recycle_idx
    ON events (origin, color_assigned_at)
    WHERE color_slot IS NOT NULL AND archived_at IS NULL;

UPDATE events e
SET color_slot = ranked.slot,
    color_assigned_at = e.created_at
FROM (
    SELECT id,
           (row_number() OVER (PARTITION BY origin ORDER BY created_at DESC, id DESC) - 1)::smallint AS slot
    FROM events
    WHERE archived_at IS NULL
) AS ranked
WHERE e.id = ranked.id AND ranked.slot < 12;
