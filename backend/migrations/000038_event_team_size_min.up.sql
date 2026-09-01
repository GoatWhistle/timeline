ALTER TABLE events ADD COLUMN team_size_min integer;

ALTER TABLE events ADD CONSTRAINT events_team_size_min_positive
    CHECK (team_size_min IS NULL OR team_size_min BETWEEN 1 AND 100);

ALTER TABLE events ADD CONSTRAINT events_team_size_range
    CHECK (team_size_min IS NULL OR team_size_max IS NULL OR team_size_min <= team_size_max);
