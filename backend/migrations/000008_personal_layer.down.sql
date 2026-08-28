DROP TABLE IF EXISTS checklist_template_items;
DROP TABLE IF EXISTS checklist_templates;
DROP TABLE IF EXISTS event_bookmarks;
DROP TABLE IF EXISTS participant_outcomes;
DROP TABLE IF EXISTS participant_artifacts;
DROP TABLE IF EXISTS participant_notes;
DROP TABLE IF EXISTS participant_tasks;
ALTER TABLE stages DROP CONSTRAINT IF EXISTS stages_id_event_key;
