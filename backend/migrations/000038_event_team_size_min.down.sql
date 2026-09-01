ALTER TABLE events DROP CONSTRAINT IF EXISTS events_team_size_range;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_team_size_min_positive;
ALTER TABLE events DROP COLUMN IF EXISTS team_size_min;
