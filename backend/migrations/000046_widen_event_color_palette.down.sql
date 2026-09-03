UPDATE events
SET color_slot = NULL, color_assigned_at = NULL
WHERE color_slot >= 12;

ALTER TABLE events DROP CONSTRAINT events_color_slot_range;

ALTER TABLE events ADD CONSTRAINT events_color_slot_range
    CHECK (color_slot IS NULL OR color_slot BETWEEN 0 AND 11);
