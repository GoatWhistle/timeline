DROP TRIGGER IF EXISTS team_members_roster_cleanup ON team_members;
DROP FUNCTION IF EXISTS team_members_clear_rosters();

DROP TABLE IF EXISTS team_event_participants;
DROP FUNCTION IF EXISTS team_event_participants_require_active();

ALTER TABLE team_event_entries DROP CONSTRAINT IF EXISTS team_event_entries_id_team_key;
