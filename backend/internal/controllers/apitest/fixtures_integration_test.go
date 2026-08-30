//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

const password = "correct-horse-battery-staple"

const (
	missingEventID  = "ev_zzzzzzzzzzzz"
	missingTaskID   = "tk_zzzzzzzzzzzz"
	missingStatusID = "rs_zzzzzzzzzzzz"
	missingRuleID   = "nr_zzzzzzzzzzzz"
	missingSessID   = "se_zzzzzzzzzzzz"
)

type account struct {
	ID    string
	Email string
}

func (s *stack) register(t *testing.T, email string) account {
	t.Helper()
	c := s.client(t)
	resp := c.post("/auth/register", map[string]string{
		"first_name": "Test",
		"last_name":  email,
		"email":      email,
		"password":   password,
	})
	requireStatus(t, resp, http.StatusOK, "registering "+email)

	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	resp.decode(t, &body)
	return account{ID: body.User.ID, Email: email}
}

func (s *stack) promote(t *testing.T, id string) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE users SET is_admin = true WHERE display_id = $1`, id); err != nil {
		t.Fatalf("promoting %s to administrator: %v", id, err)
	}
}

func (s *stack) userUUID(t *testing.T, displayID string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT id FROM users WHERE display_id = $1`, displayID).Scan(&id); err != nil {
		t.Fatalf("resolving the user %s: %v", displayID, err)
	}
	return id
}

func (s *stack) anonymous(t *testing.T, path string) response {
	t.Helper()
	return s.client(t).get(path)
}

func (s *stack) showOnProfile(t *testing.T, userID string) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE event_participants SET show_on_profile = true
		 WHERE user_id = (SELECT id FROM users WHERE display_id = $1)`, userID); err != nil {
		t.Fatalf("allowing the events of %s on the profile: %v", userID, err)
	}
}

func (s *stack) session(t *testing.T, acc account) *client {
	t.Helper()
	c := s.client(t)
	c.login(acc.Email, password)
	return c
}

type fixture struct {
	admin       account
	member      account
	outsider    account
	eventID     string
	otherEvent  string
	memberPart  string
	statusID    string
	regRuleID   string
	adminClient *client
}

func (s *stack) seed(t *testing.T) fixture {
	t.Helper()

	suffix := strings.ReplaceAll(uuid.NewString(), "-", "")
	admin := s.register(t, "admin-"+suffix+"@example.com")
	s.promote(t, admin.ID)
	member := s.register(t, "member-"+suffix+"@example.com")
	outsider := s.register(t, "outsider-"+suffix+"@example.com")

	adminClient := s.session(t, admin)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	eventID := adminClient.createEvent(t, "Member event", start)
	otherEvent := adminClient.createEvent(t, "Foreign event", start)
	adminClient.publish(t, eventID)
	adminClient.publish(t, otherEvent)

	notes := "internal administrative note"
	requireStatus(t, adminClient.patch("/admin/events/"+eventID,
		map[string]any{"notes": notes}), http.StatusOK, "attaching notes")

	requireStatus(t, adminClient.post("/admin/events/"+eventID+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the registration")

	addResp := adminClient.post("/admin/events/"+eventID+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": member.ID, "team_role": "Developer"}}})
	requireStatus(t, addResp, http.StatusOK, "assigning the member")
	if !containsAll(string(addResp.Body), `"succeeded":1`) {
		t.Fatalf("assigning the member did not succeed: %s", addResp.Body)
	}

	memberPart, statusID := adminClient.rosterIDs(t, eventID, member.ID)

	ruleResp := adminClient.post("/admin/events/"+eventID+"/registration/rules",
		map[string]any{"offset_minutes": 60})
	requireStatus(t, ruleResp, http.StatusCreated, "creating a reminder rule")
	var rule struct {
		ID string `json:"id"`
	}
	ruleResp.decode(t, &rule)

	return fixture{
		admin: admin, member: member, outsider: outsider,
		eventID: eventID, otherEvent: otherEvent,
		memberPart: memberPart, statusID: statusID, regRuleID: rule.ID,
		adminClient: adminClient,
	}
}

func (c *client) createEvent(t *testing.T, title string, start time.Time) string {
	t.Helper()
	resp := c.post("/admin/events", map[string]any{
		"title":    title,
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(48 * time.Hour).Format(time.RFC3339),
	})
	requireStatus(t, resp, http.StatusCreated, "creating event "+title)
	var body struct {
		ID string `json:"id"`
	}
	resp.decode(t, &body)
	return body.ID
}

func (c *client) publish(t *testing.T, id string) {
	t.Helper()
	requireStatus(t, c.post("/admin/events/"+id+"/publish", nil),
		http.StatusOK, "publishing "+id)
}

func (c *client) rosterIDs(t *testing.T, eventID, userID string) (string, string) {
	t.Helper()
	resp := c.get("/admin/events/" + eventID + "/participants")
	requireStatus(t, resp, http.StatusOK, "listing participants")
	var body struct {
		Items []struct {
			ID   string `json:"id"`
			User struct {
				ID string `json:"id"`
			} `json:"user"`
			RegistrationStatus *struct {
				ID string `json:"id"`
			} `json:"registration_status"`
		} `json:"items"`
	}
	resp.decode(t, &body)
	for _, item := range body.Items {
		if item.User.ID != userID {
			continue
		}
		if item.RegistrationStatus == nil {
			t.Fatalf("participant %s carries no registration status: %s", item.ID, resp.Body)
		}
		return item.ID, item.RegistrationStatus.ID
	}
	t.Fatalf("user %s is not in the roster of %s: %s", userID, eventID, resp.Body)
	return "", ""
}
