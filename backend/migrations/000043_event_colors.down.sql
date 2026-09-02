DROP INDEX IF EXISTS events_color_slot_recycle_idx;
DROP INDEX IF EXISTS events_color_slot_live_key;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_color_slot_stamped;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_color_slot_range;

ALTER TABLE events
    DROP COLUMN IF EXISTS color_assigned_at,
    DROP COLUMN IF EXISTS color_slot;
