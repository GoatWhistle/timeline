//go:build integration

package apitest_test

import (
	"net/http"
	"regexp"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

var uuidShape = regexp.MustCompile(
	`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`)

func requireNoUUID(t *testing.T, body []byte, what string) {
	t.Helper()
	for _, hit := range uuidShape.FindAllString(string(body), -1) {
		t.Fatalf("%s exposes the internal identifier %s: %s", what, hit, body)
	}
}

func TestForeignEventIsHiddenFromOutsider(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	outsider := s.Session(t, f.Outsider)

	card := outsider.Get("/events/" + f.EventID)
	support.RequireStatus(t, card, http.StatusNotFound, "reading a foreign event card")

	unknown := outsider.Get("/events/" + support.MissingEventID)
	support.RequireStatus(t, unknown, http.StatusNotFound, "reading a nonexistent event card")

	if card.ErrorCode(t) != unknown.ErrorCode(t) {
		t.Fatalf("a foreign event is distinguishable from a missing one: %s versus %s",
			card.Body, unknown.Body)
	}

	stages := outsider.Get("/events/" + f.EventID + "/stages")
	support.RequireStatus(t, stages, http.StatusNotFound, "reading foreign stages")
}

func TestMarkDoneOnForeignEventIsRejected(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	before := member.Get("/events/" + f.EventID)
	support.RequireStatus(t, before, http.StatusOK, "the member reads their own card")
	if !support.ContainsAll(string(before.Body), `"status":"TODO"`) {
		t.Fatalf("the member status is not TODO before the attempt: %s", before.Body)
	}

	outsider := s.Session(t, f.Outsider)
	resp := outsider.Post("/events/"+f.EventID+"/registration/done", nil)
	support.RequireStatus(t, resp, http.StatusNotFound, "self-reporting on a foreign event")

	after := member.Get("/events/" + f.EventID)
	if !support.ContainsAll(string(after.Body), `"status":"TODO"`) {
		t.Fatalf("the rejected foreign attempt changed the member status: %s", after.Body)
	}

	own := member.Post("/events/"+f.EventID+"/registration/done", nil)
	support.RequireStatus(t, own, http.StatusOK, "the member self-reports on their own event")
	if !support.ContainsAll(string(own.Body), `"status":"DONE"`) {
		t.Fatalf("the member's own self-report did not take effect: %s", own.Body)
	}
}

func TestParticipantCannotReachForeignParticipantObjects(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	outsider := s.Session(t, f.Outsider)

	cases := []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"team role of a foreign participant", http.MethodPatch,
			"/admin/participants/" + f.MemberPart + "/team-role",
			map[string]any{"team_role": "Hijacked"}},
		{"reactivation of a foreign participant", http.MethodPost,
			"/admin/participants/" + f.MemberPart + "/reactivate", nil},
		{"status of a foreign participant", http.MethodPatch,
			"/admin/registration-statuses/" + f.StatusID,
			map[string]any{"status": "DONE"}},
		{"reminder rule of a foreign event", http.MethodPatch,
			"/admin/registration-rules/" + f.RegRuleID,
			map[string]any{"enabled": false}},
		{"roster of a foreign event", http.MethodGet,
			"/admin/events/" + f.EventID + "/participants", nil},
		{"statuses of a foreign event", http.MethodGet,
			"/admin/events/" + f.EventID + "/registration-statuses", nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var resp support.Response
			if tc.method == http.MethodGet {
				resp = outsider.Get(tc.path)
			} else {
				resp = outsider.Mutate(tc.method, tc.path, tc.body)
			}
			support.RequireStatus(t, resp, http.StatusForbidden, tc.name)
		})
	}

	roster := f.AdminClient.Get("/admin/events/" + f.EventID + "/participants")
	support.RequireStatus(t, roster, http.StatusOK, "the administrator reads the roster")
	if !support.ContainsAll(string(roster.Body), `"team_role":"Developer"`) {
		t.Fatalf("a rejected attempt altered the team role: %s", roster.Body)
	}
	if !support.ContainsAll(string(roster.Body), `"status":"TODO"`) {
		t.Fatalf("a rejected attempt altered the registration status: %s", roster.Body)
	}
}

func TestProfileEndpointsActOnlyOnTheCaller(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	me := member.Get("/me")
	support.RequireStatus(t, me, http.StatusOK, "the member reads their own profile")
	if !support.ContainsAll(string(me.Body), f.Member.ID) {
		t.Fatalf("/me returned a different support.Account: %s", me.Body)
	}

	renamed := member.Patch("/me", map[string]any{"last_name": "Renamed"})
	support.RequireStatus(t, renamed, http.StatusOK, "the member renames themselves")

	outsider := s.Session(t, f.Outsider)
	theirs := outsider.Get("/me")
	support.RequireStatus(t, theirs, http.StatusOK, "the outsider reads their own profile")
	if support.ContainsAll(string(theirs.Body), "Renamed") {
		t.Fatalf("one support.Account's rename reached another: %s", theirs.Body)
	}
	if !support.ContainsAll(string(theirs.Body), f.Outsider.ID) {
		t.Fatalf("/me returned a different support.Account for the outsider: %s", theirs.Body)
	}

	support.RequireNoBodyField(t, me, "password_hash", "/me")
	support.RequireNoBodyField(t, me, "telegram_chat_id", "/me")
}

func TestPublicProfileNeverExposesAnInternalIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "audited", "profile_public": true,
	}), http.StatusOK, "opening the profile")
	s.ShowOnProfile(t, f.Member.ID)

	page := s.Anonymous(t, "/profiles/audited")
	support.RequireStatus(t, page, http.StatusOK, "reading an open profile without signing in")
	if !support.ContainsAll(string(page.Body), f.EventID) {
		t.Fatalf("the public profile does not carry the event display identifier: %s", page.Body)
	}
	requireNoUUID(t, page.Body, "the unauthenticated public profile")
}

func TestClosedProfileIsIndistinguishableFromAMissingOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	claim := member.Patch("/me", map[string]any{"nickname": "closed"})
	support.RequireStatus(t, claim, http.StatusOK, "claiming a nickname")
	closed := s.Anonymous(t, "/profiles/closed")
	support.RequireStatus(t, closed, http.StatusNotFound, "reading a closed profile")

	missing := s.Anonymous(t, "/profiles/nobodyhere")
	support.RequireStatus(t, missing, http.StatusNotFound, "reading a nickname nobody claimed")

	if stripRequestID(t, string(closed.Body)) != stripRequestID(t, string(missing.Body)) {
		t.Fatalf("a closed profile answers %s while a missing one answers %s: "+
			"the support.Response tells an attacker the support.Account exists", closed.Body, missing.Body)
	}
}

func TestCalendarFeedNeverExposesAnInternalIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	secret := issueFeed(s.Session(t, f.Member), t)
	body := fetchFeed(s, t, secret, http.StatusOK)
	if !support.ContainsAll(body, "UID:event-"+f.EventID+"@timeline") {
		t.Fatalf("the feed does not identify the event by its display identifier: %s", body)
	}
	requireNoUUID(t, []byte(body), "the unauthenticated calendar feed")
}

func TestOwnSurfacesNeverExposeAnInternalIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	bookmark := member.Mutate(http.MethodPut, "/me/bookmarks/"+f.EventID, nil)
	support.RequireStatus(t, bookmark, http.StatusNoContent, "bookmarking an event")
	joined := member.Post("/events/"+f.OtherEvent+"/join", map[string]any{"team_role": "Developer"})
	support.RequireStatus(t, joined, http.StatusCreated, "joining the open event")
	requireNoUUID(t, joined.Body, "the self-signup support.Response")

	for _, path := range []string{"/me", "/me/bookmarks", "/me/events", "/me/history",
		"/me/sessions", "/me/notifications", "/me/events-feed", "/catalog",
		"/events/" + f.EventID, "/events/" + f.EventID + "/stages"} {
		resp := member.Get(path)
		support.RequireStatus(t, resp, http.StatusOK, "reading "+path)
		requireNoUUID(t, resp.Body, path)
	}
}

func TestQueueDiagnosticsNameNotificationsByDisplayIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := notificationOf(s, t, f.StatusID)
	markTerminal(s, t, id, "FAILED", "the provider call limit is exhausted")

	resp := f.AdminClient.Get("/ops/queue?scope=failures")
	support.RequireStatus(t, resp, http.StatusOK, "reading the failure diagnostics")
	if !support.ContainsAll(string(resp.Body), id) {
		t.Fatalf("the diagnostics do not name the notification %s: %s", id, resp.Body)
	}
	requireNoUUID(t, resp.Body, "the queue diagnostics")
}
