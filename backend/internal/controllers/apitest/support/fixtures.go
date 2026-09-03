//go:build integration

package support

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

const Password = "correct-horse-battery-staple"

func Nickname() string {
	return "u" + strings.ReplaceAll(uuid.NewString(), "-", "")[:20]
}

const (
	MissingEventID  = "ev_zzzzzzzzzzzz"
	MissingTaskID   = "tk_zzzzzzzzzzzz"
	MissingStatusID = "rs_zzzzzzzzzzzz"
	MissingRuleID   = "nr_zzzzzzzzzzzz"
	MissingSessID   = "se_zzzzzzzzzzzz"
)

type Account struct {
	ID    string
	Email string
}

func (s *Stack) Register(t *testing.T, email string) Account {
	t.Helper()
	c := s.Client(t)
	resp := c.Post("/auth/register", map[string]string{
		"first_name": "Test",
		"last_name":  email,
		"email":      email,
		"nickname":   Nickname(),
		"password":   Password,
	})
	RequireStatus(t, resp, http.StatusOK, "registering "+email)

	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	resp.Decode(t, &body)
	return Account{ID: body.User.ID, Email: email}
}

func (s *Stack) Promote(t *testing.T, id string) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE users SET is_admin = true WHERE display_id = $1`, id); err != nil {
		t.Fatalf("promoting %s to administrator: %v", id, err)
	}
}

func (s *Stack) UserUUID(t *testing.T, displayID string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT id FROM users WHERE display_id = $1`, displayID).Scan(&id); err != nil {
		t.Fatalf("resolving the user %s: %v", displayID, err)
	}
	return id
}

func (s *Stack) Anonymous(t *testing.T, path string) Response {
	t.Helper()
	return s.Client(t).Get(path)
}

func (s *Stack) ShowOnProfile(t *testing.T, userID string) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE event_participants SET show_on_profile = true
		 WHERE user_id = (SELECT id FROM users WHERE display_id = $1)`, userID); err != nil {
		t.Fatalf("allowing the events of %s on the profile: %v", userID, err)
	}
}

func (s *Stack) Session(t *testing.T, acc Account) *Client {
	t.Helper()
	c := s.Client(t)
	c.Login(acc.Email, Password)
	return c
}

type Fixture struct {
	Admin       Account
	Member      Account
	Outsider    Account
	EventID     string
	OtherEvent  string
	MemberPart  string
	StatusID    string
	RegRuleID   string
	AdminClient *Client
}

func (s *Stack) Seed(t *testing.T) Fixture {
	t.Helper()

	suffix := strings.ReplaceAll(uuid.NewString(), "-", "")
	admin := s.Register(t, "admin-"+suffix+"@example.com")
	s.Promote(t, admin.ID)
	member := s.Register(t, "member-"+suffix+"@example.com")
	outsider := s.Register(t, "outsider-"+suffix+"@example.com")

	adminClient := s.Session(t, admin)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	eventID := adminClient.CreateEvent(t, "Member event", start)
	otherEvent := adminClient.CreateEvent(t, "Foreign event", start)
	adminClient.Publish(t, eventID)
	adminClient.Publish(t, otherEvent)

	RequireStatus(t, adminClient.Post("/admin/events/"+eventID+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the registration")

	addResp := adminClient.Post("/admin/events/"+eventID+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": member.ID, "team_role": "Developer"}}})
	RequireStatus(t, addResp, http.StatusOK, "assigning the member")
	if !ContainsAll(string(addResp.Body), `"succeeded":1`) {
		t.Fatalf("assigning the member did not succeed: %s", addResp.Body)
	}

	memberPart, statusID := adminClient.RosterIDs(t, eventID, member.ID)

	ruleResp := adminClient.Post("/admin/events/"+eventID+"/registration/rules",
		map[string]any{"offset_minutes": 60})
	RequireStatus(t, ruleResp, http.StatusCreated, "creating a reminder rule")
	var rule struct {
		ID string `json:"id"`
	}
	ruleResp.Decode(t, &rule)

	return Fixture{
		Admin: admin, Member: member, Outsider: outsider,
		EventID: eventID, OtherEvent: otherEvent,
		MemberPart: memberPart, StatusID: statusID, RegRuleID: rule.ID,
		AdminClient: adminClient,
	}
}

func (c *Client) CreateEvent(t *testing.T, title string, start time.Time) string {
	t.Helper()
	resp := c.Post("/admin/events", map[string]any{
		"title":    title,
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(48 * time.Hour).Format(time.RFC3339),
	})
	RequireStatus(t, resp, http.StatusCreated, "creating event "+title)
	var body struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &body)
	return body.ID
}

func (c *Client) Publish(t *testing.T, id string) {
	t.Helper()
	RequireStatus(t, c.Post("/admin/events/"+id+"/publish", nil),
		http.StatusOK, "publishing "+id)
}

func (c *Client) RosterIDs(t *testing.T, eventID, userID string) (string, string) {
	t.Helper()
	resp := c.Get("/admin/events/" + eventID + "/participants")
	RequireStatus(t, resp, http.StatusOK, "listing participants")
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
	resp.Decode(t, &body)
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
