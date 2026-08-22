DROP TRIGGER IF EXISTS notifications_no_delete ON notifications;
DROP FUNCTION IF EXISTS notifications_forbid_delete();
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_rules;
