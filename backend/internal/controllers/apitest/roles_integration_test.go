//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type adminRoute struct {
	name   string
	method string
	path   string
	body   any
}

func adminRoutes(f support.Fixture) []adminRoute {
	event := f.EventID
	return []adminRoute{
		{"user search", http.MethodGet, "/admin/users", nil},
		{"user deactivation", http.MethodPost, "/admin/users/" + f.Member.ID + "/deactivate", nil},
		{"user activation", http.MethodPost, "/admin/users/" + f.Member.ID + "/activate", nil},
		{"user deletion", http.MethodDelete, "/admin/users/" + f.Member.ID, nil},
		{"invite creation", http.MethodPost, "/admin/invites", map[string]any{"email": "target@example.com"}},
		{"invite list", http.MethodGet, "/admin/invites", nil},
		{"event list", http.MethodGet, "/admin/events", nil},
		{"event creation", http.MethodPost, "/admin/events", map[string]any{
			"title":    "Injected",
			"start_at": time.Now().UTC().Add(time.Hour).Format(time.RFC3339),
			"end_at":   time.Now().UTC().Add(2 * time.Hour).Format(time.RFC3339),
		}},
		{"event read", http.MethodGet, "/admin/events/" + event, nil},
		{"event update", http.MethodPatch, "/admin/events/" + event, map[string]any{"title": "Injected"}},
		{"event publishing", http.MethodPost, "/admin/events/" + event + "/publish", nil},
		{"event archiving", http.MethodPost, "/admin/events/" + event + "/archive", nil},
		{"stage creation", http.MethodPost, "/admin/events/" + event + "/stages", map[string]any{
			"name":     "Injected",
			"type":     "OTHER",
			"start_at": time.Now().UTC().Add(time.Hour).Format(time.RFC3339),
		}},
		{"roster read", http.MethodGet, "/admin/events/" + event + "/participants", nil},
		{"roster batch add", http.MethodPost, "/admin/events/" + event + "/participants/batch-add",
			map[string]any{"items": []map[string]any{{"user_id": f.Outsider.ID, "team_role": "Intruder"}}}},
		{"roster batch remove", http.MethodPost, "/admin/events/" + event + "/participants/batch-remove",
			map[string]any{"participant_ids": []string{f.MemberPart}}},
		{"roster copy", http.MethodPost, "/admin/events/" + event + "/participants/copy-from",
			map[string]any{"source_event_id": f.OtherEvent}},
		{"registration read", http.MethodGet, "/admin/events/" + event + "/registration", nil},
		{"registration update", http.MethodPatch, "/admin/events/" + event + "/registration",
			map[string]any{"url": "https://intruder.example.com"}},
		{"registration disabling", http.MethodPost, "/admin/events/" + event + "/registration/disable", nil},
		{"rule list", http.MethodGet, "/admin/events/" + event + "/registration/rules", nil},
		{"rule creation", http.MethodPost, "/admin/events/" + event + "/registration/rules",
			map[string]any{"offset_minutes": 30}},
		{"rule disabling", http.MethodDelete, "/admin/registration-rules/" + f.RegRuleID, nil},
		{"status list", http.MethodGet, "/admin/events/" + event + "/registration-statuses", nil},
		{"status batch set", http.MethodPost, "/admin/events/" + event + "/registration-statuses/batch-set",
			map[string]any{"participant_ids": []string{f.MemberPart}, "status": "DONE"}},
		{"status batch preview", http.MethodPost,
			"/admin/events/" + event + "/registration-statuses/batch-set/preview",
			map[string]any{"participant_ids": []string{f.MemberPart}, "status": "DONE"}},
		{"upcoming query", http.MethodGet, "/admin/queries/upcoming", nil},
		{"overdue query", http.MethodGet, "/admin/queries/overdue", nil},
		{"audit log", http.MethodGet, "/admin/audit", nil},
		{"track creation", http.MethodPost, "/admin/events/" + event + "/tracks",
			map[string]any{"name": "Injected", "prizes": []map[string]any{{"place": 1, "amount": "1"}}}},
		{"track update", http.MethodPatch, "/admin/tracks/" + support.MissingTrackID,
			map[string]any{"name": "Injected"}},
		{"track deletion", http.MethodDelete, "/admin/tracks/" + support.MissingTrackID, nil},
	}
}

func TestParticipantIsRefusedEveryAdministrativeRoute(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	for _, route := range adminRoutes(f) {
		t.Run(route.name, func(t *testing.T) {
			var resp support.Response
			if route.method == http.MethodGet {
				resp = member.Get(route.path)
			} else {
				resp = member.Mutate(route.method, route.path, route.body)
			}
			support.RequireStatus(t, resp, http.StatusForbidden, route.name)
		})
	}

	if code := member.Get("/admin/audit").ErrorCode(t); code == "" {
		t.Fatal("a refusal carried no stable error code")
	}
}

func TestAdministrativeStateSurvivesRefusedParticipantAttempts(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	for _, route := range adminRoutes(f) {
		if route.method == http.MethodGet {
			continue
		}
		member.Mutate(route.method, route.path, route.body)
	}

	event := f.AdminClient.Get("/admin/events/" + f.EventID)
	support.RequireStatus(t, event, http.StatusOK, "reading the event after the attempts")
	if support.ContainsAll(string(event.Body), "Injected") {
		t.Fatalf("a refused participant request modified the event: %s", event.Body)
	}
	if !support.ContainsAll(string(event.Body), `"title":"Member event"`) {
		t.Fatalf("the event title no longer matches the support.Fixture: %s", event.Body)
	}

	roster := f.AdminClient.Get("/admin/events/" + f.EventID + "/participants")
	support.RequireStatus(t, roster, http.StatusOK, "reading the roster after the attempts")
	if support.ContainsAll(string(roster.Body), f.Outsider.ID) {
		t.Fatalf("a refused participant request added an outsider: %s", roster.Body)
	}
	if !support.ContainsAll(string(roster.Body), `"status":"TODO"`) {
		t.Fatalf("a refused participant request changed a status: %s", roster.Body)
	}

	tracks := f.AdminClient.Get("/events/" + f.EventID + "/tracks")
	support.RequireStatus(t, tracks, http.StatusOK, "reading the tracks after the attempts")
	if support.ContainsAll(string(tracks.Body), "Injected") {
		t.Fatalf("a refused participant request created a track: %s", tracks.Body)
	}

	users := f.AdminClient.Get("/admin/users")
	support.RequireStatus(t, users, http.StatusOK, "reading the support.Account list after the attempts")
	if !support.ContainsAll(string(users.Body), f.Member.ID) {
		t.Fatalf("a refused participant request deleted an support.Account: %s", users.Body)
	}
}

func TestAdministrativeRoutesSucceedForAdministrator(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, route := range []adminRoute{
		{"user search", http.MethodGet, "/admin/users", nil},
		{"event read", http.MethodGet, "/admin/events/" + f.EventID, nil},
		{"roster read", http.MethodGet, "/admin/events/" + f.EventID + "/participants", nil},
		{"status list", http.MethodGet, "/admin/events/" + f.EventID + "/registration-statuses", nil},
		{"rule list", http.MethodGet, "/admin/events/" + f.EventID + "/registration/rules", nil},
		{"audit log", http.MethodGet, "/admin/audit", nil},
	} {
		t.Run(route.name, func(t *testing.T) {
			support.RequireStatus(t, f.AdminClient.Get(route.path), http.StatusOK, route.name)
		})
	}

	renamed := f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"title": "Renamed by the administrator"})
	support.RequireStatus(t, renamed, http.StatusOK, "the administrator renames the event")

	statusChange := f.AdminClient.Patch("/admin/registration-statuses/"+f.StatusID,
		map[string]any{"status": "NOT_REQUIRED"})
	support.RequireStatus(t, statusChange, http.StatusOK, "the administrator changes a status")
}

func TestUnauthenticatedRequestsAreRejectedBeforeRoleChecks(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	anonymous := s.Client(t)

	for _, path := range []string{
		"/me",
		"/me/events",
		"/me/schedule",
		"/catalog",
		"/events/" + f.EventID,
		"/admin/users",
		"/admin/events",
		"/admin/audit",
	} {
		t.Run(path, func(t *testing.T) {
			support.RequireStatus(t, anonymous.Get(path), http.StatusUnauthorized, "anonymous "+path)
		})
	}

	forged := s.Client(t)
	forged.SetCookie(support.AccessCookie, "not-a-token")
	support.RequireStatus(t, forged.Get("/me"), http.StatusUnauthorized, "a forged access token")

	random := s.Client(t)
	random.SetCookie(support.AccessCookie, uuid.NewString())
	support.RequireStatus(t, random.Get("/admin/users"), http.StatusUnauthorized, "a random access token")
}
