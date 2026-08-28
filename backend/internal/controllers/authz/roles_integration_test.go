//go:build integration

package authz_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
)

type adminRoute struct {
	name   string
	method string
	path   string
	body   any
}

func adminRoutes(f fixture) []adminRoute {
	event := f.eventID.String()
	return []adminRoute{
		{"user search", http.MethodGet, "/admin/users", nil},
		{"user deactivation", http.MethodPost, "/admin/users/" + f.member.ID.String() + "/deactivate", nil},
		{"user activation", http.MethodPost, "/admin/users/" + f.member.ID.String() + "/activate", nil},
		{"user deletion", http.MethodDelete, "/admin/users/" + f.member.ID.String(), nil},
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
			map[string]any{"items": []map[string]any{{"user_id": f.outsider.ID.String(), "team_role": "Intruder"}}}},
		{"roster batch remove", http.MethodPost, "/admin/events/" + event + "/participants/batch-remove",
			map[string]any{"participant_ids": []string{f.memberPart.String()}}},
		{"roster copy", http.MethodPost, "/admin/events/" + event + "/participants/copy-from",
			map[string]any{"source_event_id": f.otherEvent.String()}},
		{"registration read", http.MethodGet, "/admin/events/" + event + "/registration", nil},
		{"registration update", http.MethodPatch, "/admin/events/" + event + "/registration",
			map[string]any{"url": "https://intruder.example.com"}},
		{"registration disabling", http.MethodPost, "/admin/events/" + event + "/registration/disable", nil},
		{"rule list", http.MethodGet, "/admin/events/" + event + "/registration/rules", nil},
		{"rule creation", http.MethodPost, "/admin/events/" + event + "/registration/rules",
			map[string]any{"offset_minutes": 30}},
		{"rule disabling", http.MethodDelete, "/admin/registration-rules/" + f.regRuleID.String(), nil},
		{"status list", http.MethodGet, "/admin/events/" + event + "/registration-statuses", nil},
		{"status batch set", http.MethodPost, "/admin/events/" + event + "/registration-statuses/batch-set",
			map[string]any{"participant_ids": []string{f.memberPart.String()}, "status": "DONE"}},
		{"status batch preview", http.MethodPost,
			"/admin/events/" + event + "/registration-statuses/batch-set/preview",
			map[string]any{"participant_ids": []string{f.memberPart.String()}, "status": "DONE"}},
		{"administrative schedule", http.MethodGet, "/admin/schedule", nil},
		{"upcoming query", http.MethodGet, "/admin/queries/upcoming", nil},
		{"overdue query", http.MethodGet, "/admin/queries/overdue", nil},
		{"audit log", http.MethodGet, "/admin/audit", nil},
	}
}

func TestParticipantIsRefusedEveryAdministrativeRoute(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	for _, route := range adminRoutes(f) {
		t.Run(route.name, func(t *testing.T) {
			var resp response
			if route.method == http.MethodGet {
				resp = member.get(route.path)
			} else {
				resp = member.mutate(route.method, route.path, route.body)
			}
			requireStatus(t, resp, http.StatusForbidden, route.name)
		})
	}

	if code := member.get("/admin/audit").errorCode(t); code == "" {
		t.Fatal("a refusal carried no stable error code")
	}
}

func TestAdministrativeStateSurvivesRefusedParticipantAttempts(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	for _, route := range adminRoutes(f) {
		if route.method == http.MethodGet {
			continue
		}
		member.mutate(route.method, route.path, route.body)
	}

	event := f.adminClient.get("/admin/events/" + f.eventID.String())
	requireStatus(t, event, http.StatusOK, "reading the event after the attempts")
	if containsAll(string(event.Body), "Injected") {
		t.Fatalf("a refused participant request modified the event: %s", event.Body)
	}
	if !containsAll(string(event.Body), `"title":"Member event"`) {
		t.Fatalf("the event title no longer matches the fixture: %s", event.Body)
	}

	roster := f.adminClient.get("/admin/events/" + f.eventID.String() + "/participants")
	requireStatus(t, roster, http.StatusOK, "reading the roster after the attempts")
	if containsAll(string(roster.Body), f.outsider.ID.String()) {
		t.Fatalf("a refused participant request added an outsider: %s", roster.Body)
	}
	if !containsAll(string(roster.Body), `"status":"TODO"`) {
		t.Fatalf("a refused participant request changed a status: %s", roster.Body)
	}

	users := f.adminClient.get("/admin/users")
	requireStatus(t, users, http.StatusOK, "reading the account list after the attempts")
	if !containsAll(string(users.Body), f.member.ID.String()) {
		t.Fatalf("a refused participant request deleted an account: %s", users.Body)
	}
}

func TestAdministrativeRoutesSucceedForAdministrator(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	for _, route := range []adminRoute{
		{"user search", http.MethodGet, "/admin/users", nil},
		{"event read", http.MethodGet, "/admin/events/" + f.eventID.String(), nil},
		{"roster read", http.MethodGet, "/admin/events/" + f.eventID.String() + "/participants", nil},
		{"status list", http.MethodGet, "/admin/events/" + f.eventID.String() + "/registration-statuses", nil},
		{"rule list", http.MethodGet, "/admin/events/" + f.eventID.String() + "/registration/rules", nil},
		{"audit log", http.MethodGet, "/admin/audit", nil},
		{"administrative schedule", http.MethodGet, "/admin/schedule", nil},
	} {
		t.Run(route.name, func(t *testing.T) {
			requireStatus(t, f.adminClient.get(route.path), http.StatusOK, route.name)
		})
	}

	renamed := f.adminClient.patch("/admin/events/"+f.eventID.String(),
		map[string]any{"title": "Renamed by the administrator"})
	requireStatus(t, renamed, http.StatusOK, "the administrator renames the event")

	statusChange := f.adminClient.patch("/admin/registration-statuses/"+f.statusID.String(),
		map[string]any{"status": "NOT_REQUIRED"})
	requireStatus(t, statusChange, http.StatusOK, "the administrator changes a status")
}

func TestUnauthenticatedRequestsAreRejectedBeforeRoleChecks(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	anonymous := s.client(t)

	for _, path := range []string{
		"/me",
		"/me/events",
		"/me/schedule",
		"/catalog",
		"/events/" + f.eventID.String(),
		"/admin/users",
		"/admin/events",
		"/admin/audit",
	} {
		t.Run(path, func(t *testing.T) {
			requireStatus(t, anonymous.get(path), http.StatusUnauthorized, "anonymous "+path)
		})
	}

	forged := s.client(t)
	forged.setCookie(accessCookie, "not-a-token")
	requireStatus(t, forged.get("/me"), http.StatusUnauthorized, "a forged access token")

	random := s.client(t)
	random.setCookie(accessCookie, uuid.NewString())
	requireStatus(t, random.get("/admin/users"), http.StatusUnauthorized, "a random access token")
}
