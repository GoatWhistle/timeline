//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
)

type historyPage struct {
	Items []struct {
		ID         string  `json:"id"`
		Type       string  `json:"type"`
		Status     string  `json:"status"`
		Channel    *string `json:"channel"`
		EventTitle *string `json:"event_title"`
		Preview    *string `json:"preview"`
		Redacted   bool    `json:"redacted"`
	} `json:"items"`
	Meta struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

func (c *client) notificationHistory(t *testing.T) historyPage {
	t.Helper()
	resp := c.get("/me/notifications")
	requireStatus(t, resp, http.StatusOK, "reading the notification history")

	var page historyPage
	resp.decode(t, &page)
	return page
}

func TestNotificationHistoryShowsOnlyOwnNotifications(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	if _, err := s.db.Pool().Exec(t.Context(), `
		UPDATE notifications SET status = 'SENT', sent_at = now()
		WHERE recipient_user_id = (SELECT id FROM users WHERE display_id = $1)`, f.member.ID); err != nil {
		t.Fatalf("marking notifications sent: %v", err)
	}

	owner := s.session(t, f.member)
	page := owner.notificationHistory(t)
	if page.Meta.Total == 0 {
		t.Fatal("the recipient sees no notifications of their own")
	}

	outsider := s.session(t, f.outsider)
	foreign := outsider.notificationHistory(t)
	if foreign.Meta.Total != 0 {
		t.Fatalf("an unrelated user sees %d notifications addressed to someone else",
			foreign.Meta.Total)
	}

	admin := s.session(t, f.admin)
	adminPage := admin.notificationHistory(t)
	if adminPage.Meta.Total != 0 {
		t.Fatalf("the administrator sees %d notifications of another recipient: "+
			"the history is scoped by recipient, not by role", adminPage.Meta.Total)
	}
}

func TestNotificationHistorySurvivesThePayloadPurge(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	owner := s.session(t, f.member)
	before := owner.notificationHistory(t)
	if before.Meta.Total == 0 {
		t.Fatal("no notification to purge")
	}
	if before.Items[0].Preview == nil {
		t.Fatal("a fresh notification carries no preview")
	}
	if before.Items[0].Redacted {
		t.Fatal("a fresh notification is reported as redacted")
	}

	if _, err := s.db.Pool().Exec(t.Context(), `
		UPDATE notifications SET payload_json = NULL WHERE recipient_user_id = (SELECT id FROM users WHERE display_id = $1)`,
		f.member.ID); err != nil {
		t.Fatalf("clearing the payload: %v", err)
	}

	after := owner.notificationHistory(t)
	if after.Meta.Total != before.Meta.Total {
		t.Fatalf("clearing the payload changed the row count from %d to %d: "+
			"specification 4 keeps the row and clears only the payload",
			before.Meta.Total, after.Meta.Total)
	}
	item := after.Items[0]
	if item.Preview != nil {
		t.Fatalf("a purged notification still returns a preview: %q", *item.Preview)
	}
	if !item.Redacted {
		t.Fatal("a purged notification is not marked redacted, so the screen cannot explain the gap")
	}
	if item.Type == "" || item.Status == "" {
		t.Fatal("a purged notification lost its type or status, which do not live in the payload")
	}
}

func TestNotificationHistoryNeverReturnsTheWholePayload(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	owner := s.session(t, f.member)
	resp := owner.get("/me/notifications")
	requireStatus(t, resp, http.StatusOK, "reading the notification history")

	var raw map[string]any
	resp.decode(t, &raw)
	items, _ := raw["items"].([]any)
	if len(items) == 0 {
		t.Fatal("no notification to inspect")
	}
	first, _ := items[0].(map[string]any)
	for _, field := range []string{"payload", "payload_json", "body", "logical_key",
		"recipient_user_id", "registration_status_id"} {
		if _, present := first[field]; present {
			t.Fatalf("the history exposes %q; specification 117l requires a preview, "+
				"not the payload", field)
		}
	}
}
