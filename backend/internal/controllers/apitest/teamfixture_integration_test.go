//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type teamDetail struct {
	Team struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		IsLead  bool   `json:"is_lead"`
		MyState string `json:"my_state"`
		Lead    struct {
			ID string `json:"id"`
		} `json:"lead"`
	} `json:"team"`
	Members []struct {
		ID     string `json:"id"`
		State  string `json:"state"`
		IsLead bool   `json:"is_lead"`
		User   struct {
			ID string `json:"id"`
		} `json:"user"`
	} `json:"members"`
}

type teamStanding struct {
	ID              string `json:"id"`
	TeamID          string `json:"team_id"`
	EventID         string `json:"event_id"`
	RosterSize      int    `json:"roster_size"`
	AssignedMembers int    `json:"assigned_members"`
	RegisteredCount int    `json:"registered_count"`
	TeamSizeMin     *int   `json:"team_size_min"`
	TeamSizeMax     *int   `json:"team_size_max"`
	Registered      bool   `json:"registered"`
	Roster          []struct {
		MemberID           string  `json:"member_id"`
		IsLead             bool    `json:"is_lead"`
		Assigned           bool    `json:"assigned"`
		RegistrationStatus *string `json:"registration_status"`
		User               struct {
			ID string `json:"id"`
		} `json:"user"`
	} `json:"roster"`
}

type teamFixture struct {
	Admin       support.Account
	AdminClient *support.Client
	Lead        support.Account
	LeadClient  *support.Client
	Mates       []support.Account
	Outsider    support.Account
	TeamID      string
	EventID     string
}

func seedTeam(s *support.Stack, t *testing.T, mates int, teamSizeMin, teamSizeMax *int) teamFixture {
	t.Helper()

	suffix := strings.ReplaceAll(uuid.NewString(), "-", "")
	admin := s.Register(t, "tadmin-"+suffix+"@example.com")
	s.Promote(t, admin.ID)
	adminClient := s.Session(t, admin)

	lead := s.Register(t, "tlead-"+suffix+"@example.com")
	leadClient := s.Session(t, lead)
	outsider := s.Register(t, "toutsider-"+suffix+"@example.com")

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	eventID := createHackathon(adminClient, t, "Team hackathon "+suffix[:8], start, teamSizeMin, teamSizeMax)
	adminClient.Publish(t, eventID)
	support.RequireStatus(t, adminClient.Post("/admin/events/"+eventID+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the registration")

	teamID := createTeam(leadClient, t, "Night shift "+suffix[:8])
	assignToEvent(adminClient, t, eventID, lead.ID)

	accounts := make([]support.Account, 0, mates)
	for index := 0; index < mates; index++ {
		mate := s.Register(t, "tmate"+suffix[:6]+string(rune('a'+index))+"@example.com")
		inviteAndAccept(s, leadClient, t, teamID, mate)
		assignToEvent(adminClient, t, eventID, mate.ID)
		accounts = append(accounts, mate)
	}

	return teamFixture{
		Admin: admin, AdminClient: adminClient,
		Lead: lead, LeadClient: leadClient,
		Mates: accounts, Outsider: outsider,
		TeamID: teamID, EventID: eventID,
	}
}

func createHackathon(c *support.Client, t *testing.T, title string, start time.Time,
	sizeMin, sizeMax *int) string {
	t.Helper()
	body := map[string]any{
		"title":    title,
		"kind":     "HACKATHON",
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(48 * time.Hour).Format(time.RFC3339),
	}
	if sizeMin != nil {
		body["team_size_min"] = *sizeMin
	}
	if sizeMax != nil {
		body["team_size_max"] = *sizeMax
	}
	resp := c.Post("/admin/events", body)
	support.RequireStatus(t, resp, http.StatusCreated, "creating hackathon "+title)
	var created struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &created)
	return created.ID
}

func createTeam(c *support.Client, t *testing.T, name string) string {
	t.Helper()
	resp := c.Post("/teams", map[string]any{"name": name})
	support.RequireStatus(t, resp, http.StatusCreated, "creating team "+name)
	var detail teamDetail
	resp.Decode(t, &detail)
	return detail.Team.ID
}

func inviteAndAccept(s *support.Stack, lead *support.Client, t *testing.T,
	teamID string, mate support.Account) {
	t.Helper()
	support.RequireStatus(t, lead.Post("/teams/"+teamID+"/invitations",
		map[string]any{"user_id": mate.ID}), http.StatusOK, "inviting "+mate.Email)
	mateClient := s.Session(t, mate)
	support.RequireStatus(t, mateClient.Post("/teams/"+teamID+"/membership", nil),
		http.StatusOK, mate.Email+" accepting the invitation")
}

func assignToEvent(admin *support.Client, t *testing.T, eventID, userID string) {
	t.Helper()
	resp := admin.Post("/admin/events/"+eventID+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": userID, "team_role": "Developer"}}})
	support.RequireStatus(t, resp, http.StatusOK, "assigning "+userID)
	if !support.ContainsAll(string(resp.Body), `"succeeded":1`) {
		t.Fatalf("assigning %s did not succeed: %s", userID, resp.Body)
	}
}

func enterEvent(c *support.Client, t *testing.T, teamID, eventID string) teamStanding {
	t.Helper()
	resp := c.Post("/teams/"+teamID+"/events", map[string]any{"event_id": eventID})
	support.RequireStatus(t, resp, http.StatusCreated, "entering "+eventID)
	var standing teamStanding
	resp.Decode(t, &standing)
	return standing
}

func readStanding(c *support.Client, t *testing.T, teamID, eventID string) teamStanding {
	t.Helper()
	resp := c.Get("/teams/" + teamID + "/events/" + eventID)
	support.RequireStatus(t, resp, http.StatusOK, "reading the standing of "+teamID)
	var standing teamStanding
	resp.Decode(t, &standing)
	return standing
}

func readTeam(c *support.Client, t *testing.T, teamID string) teamDetail {
	t.Helper()
	resp := c.Get("/teams/" + teamID)
	support.RequireStatus(t, resp, http.StatusOK, "reading team "+teamID)
	var detail teamDetail
	resp.Decode(t, &detail)
	return detail
}

func markMember(c *support.Client, teamID, eventID, userID string) support.Response {
	return c.Post("/teams/"+teamID+"/events/"+eventID+"/roster/"+userID+"/registration/done", nil)
}

func addToRoster(c *support.Client, teamID, eventID, userID string) support.Response {
	return c.Mutate(http.MethodPut, "/teams/"+teamID+"/events/"+eventID+"/roster/"+userID, nil)
}

func removeFromRoster(c *support.Client, teamID, eventID, userID string) support.Response {
	return c.Delete("/teams/" + teamID + "/events/" + eventID + "/roster/" + userID)
}

func fillRoster(c *support.Client, t *testing.T, teamID, eventID string, users ...string) {
	t.Helper()
	for _, userID := range users {
		support.RequireStatus(t, addToRoster(c, teamID, eventID, userID),
			http.StatusOK, "putting "+userID+" on the roster")
	}
}
