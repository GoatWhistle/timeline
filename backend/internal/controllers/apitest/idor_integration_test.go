//go:build integration

package apitest_test

import (
	"net/http"
	"regexp"
	"testing"
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
	s := newStack(t)
	f := s.seed(t)
	outsider := s.session(t, f.outsider)

	card := outsider.get("/events/" + f.eventID)
	requireStatus(t, card, http.StatusNotFound, "reading a foreign event card")

	unknown := outsider.get("/events/" + missingEventID)
	requireStatus(t, unknown, http.StatusNotFound, "reading a nonexistent event card")

	if card.errorCode(t) != unknown.errorCode(t) {
		t.Fatalf("a foreign event is distinguishable from a missing one: %s versus %s",
			card.Body, unknown.Body)
	}

	stages := outsider.get("/events/" + f.eventID + "/stages")
	requireStatus(t, stages, http.StatusNotFound, "reading foreign stages")
}

func TestMarkDoneOnForeignEventIsRejected(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	before := member.get("/events/" + f.eventID)
	requireStatus(t, before, http.StatusOK, "the member reads their own card")
	if !containsAll(string(before.Body), `"status":"TODO"`) {
		t.Fatalf("the member status is not TODO before the attempt: %s", before.Body)
	}

	outsider := s.session(t, f.outsider)
	resp := outsider.post("/events/"+f.eventID+"/registration/done", nil)
	requireStatus(t, resp, http.StatusNotFound, "self-reporting on a foreign event")

	after := member.get("/events/" + f.eventID)
	if !containsAll(string(after.Body), `"status":"TODO"`) {
		t.Fatalf("the rejected foreign attempt changed the member status: %s", after.Body)
	}

	own := member.post("/events/"+f.eventID+"/registration/done", nil)
	requireStatus(t, own, http.StatusOK, "the member self-reports on their own event")
	if !containsAll(string(own.Body), `"status":"DONE"`) {
		t.Fatalf("the member's own self-report did not take effect: %s", own.Body)
	}
}

func TestAdminNotesAreInvisibleToParticipant(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	card := member.get("/events/" + f.eventID)
	requireStatus(t, card, http.StatusOK, "the member reads their own card")
	requireNoBodyField(t, card, "notes", "the participant event card")

	catalog := member.get("/catalog")
	requireStatus(t, catalog, http.StatusOK, "the member reads the catalog")
	requireNoBodyField(t, catalog, "notes", "the catalog")

	adminView := f.adminClient.get("/admin/events/" + f.eventID)
	requireStatus(t, adminView, http.StatusOK, "the administrator reads the event")
	if !containsAll(string(adminView.Body), "internal administrative note") {
		t.Fatalf("the administrator cannot see the notes either: %s", adminView.Body)
	}
}

func TestParticipantCannotReachForeignParticipantObjects(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	outsider := s.session(t, f.outsider)

	cases := []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"team role of a foreign participant", http.MethodPatch,
			"/admin/participants/" + f.memberPart + "/team-role",
			map[string]any{"team_role": "Hijacked"}},
		{"reactivation of a foreign participant", http.MethodPost,
			"/admin/participants/" + f.memberPart + "/reactivate", nil},
		{"status of a foreign participant", http.MethodPatch,
			"/admin/registration-statuses/" + f.statusID,
			map[string]any{"status": "DONE"}},
		{"reminder rule of a foreign event", http.MethodPatch,
			"/admin/registration-rules/" + f.regRuleID,
			map[string]any{"enabled": false}},
		{"roster of a foreign event", http.MethodGet,
			"/admin/events/" + f.eventID + "/participants", nil},
		{"statuses of a foreign event", http.MethodGet,
			"/admin/events/" + f.eventID + "/registration-statuses", nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var resp response
			if tc.method == http.MethodGet {
				resp = outsider.get(tc.path)
			} else {
				resp = outsider.mutate(tc.method, tc.path, tc.body)
			}
			requireStatus(t, resp, http.StatusForbidden, tc.name)
		})
	}

	roster := f.adminClient.get("/admin/events/" + f.eventID + "/participants")
	requireStatus(t, roster, http.StatusOK, "the administrator reads the roster")
	if !containsAll(string(roster.Body), `"team_role":"Developer"`) {
		t.Fatalf("a rejected attempt altered the team role: %s", roster.Body)
	}
	if !containsAll(string(roster.Body), `"status":"TODO"`) {
		t.Fatalf("a rejected attempt altered the registration status: %s", roster.Body)
	}
}

func TestProfileEndpointsActOnlyOnTheCaller(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	me := member.get("/me")
	requireStatus(t, me, http.StatusOK, "the member reads their own profile")
	if !containsAll(string(me.Body), f.member.ID) {
		t.Fatalf("/me returned a different account: %s", me.Body)
	}

	renamed := member.patch("/me", map[string]any{"last_name": "Renamed"})
	requireStatus(t, renamed, http.StatusOK, "the member renames themselves")

	outsider := s.session(t, f.outsider)
	theirs := outsider.get("/me")
	requireStatus(t, theirs, http.StatusOK, "the outsider reads their own profile")
	if containsAll(string(theirs.Body), "Renamed") {
		t.Fatalf("one account's rename reached another: %s", theirs.Body)
	}
	if !containsAll(string(theirs.Body), f.outsider.ID) {
		t.Fatalf("/me returned a different account for the outsider: %s", theirs.Body)
	}

	requireNoBodyField(t, me, "password_hash", "/me")
	requireNoBodyField(t, me, "telegram_chat_id", "/me")
}

func TestPublicProfileNeverExposesAnInternalIdentifier(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	requireStatus(t, member.patch("/me", map[string]any{
		"nickname": "audited", "profile_public": true,
	}), http.StatusOK, "opening the profile")
	s.showOnProfile(t, f.member.ID)

	page := s.anonymous(t, "/profiles/audited")
	requireStatus(t, page, http.StatusOK, "reading an open profile without signing in")
	if !containsAll(string(page.Body), f.eventID) {
		t.Fatalf("the public profile does not carry the event display identifier: %s", page.Body)
	}
	requireNoUUID(t, page.Body, "the unauthenticated public profile")
}

func TestClosedProfileIsIndistinguishableFromAMissingOne(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	requireStatus(t, member.patch("/me", map[string]any{"nickname": "closed"}),
		http.StatusOK, "claiming a nickname while staying private")

	closed := s.anonymous(t, "/profiles/closed")
	requireStatus(t, closed, http.StatusNotFound, "reading a profile its owner keeps closed")

	missing := s.anonymous(t, "/profiles/nobodyhere")
	requireStatus(t, missing, http.StatusNotFound, "reading a nickname nobody claimed")

	if stripRequestID(t, string(closed.Body)) != stripRequestID(t, string(missing.Body)) {
		t.Fatalf("a closed profile answers %s while a missing one answers %s: "+
			"the response tells an attacker the account exists", closed.Body, missing.Body)
	}
}

func TestCalendarFeedNeverExposesAnInternalIdentifier(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	secret := s.session(t, f.member).issueFeed(t)
	body := s.fetchFeed(t, secret, http.StatusOK)
	if !containsAll(body, "UID:event-"+f.eventID+"@timeline") {
		t.Fatalf("the feed does not identify the event by its display identifier: %s", body)
	}
	requireNoUUID(t, []byte(body), "the unauthenticated calendar feed")
}

func TestOwnSurfacesNeverExposeAnInternalIdentifier(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	requireStatus(t, member.mutate(http.MethodPut, "/me/bookmarks/"+f.eventID, nil),
		http.StatusNoContent, "bookmarking an event")
	joined := member.post("/events/"+f.otherEvent+"/join", map[string]any{"team_role": "Developer"})
	requireStatus(t, joined, http.StatusCreated, "joining the open event")
	requireNoUUID(t, joined.Body, "the self-signup response")

	for _, path := range []string{"/me", "/me/bookmarks", "/me/events", "/me/history",
		"/me/sessions", "/me/notifications", "/me/events-feed", "/catalog",
		"/events/" + f.eventID, "/events/" + f.eventID + "/stages"} {
		resp := member.get(path)
		requireStatus(t, resp, http.StatusOK, "reading "+path)
		requireNoUUID(t, resp.Body, path)
	}
}

func TestQueueDiagnosticsNameNotificationsByDisplayIdentifier(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	id := s.notificationOf(t, f.statusID)
	s.markTerminal(t, id, "FAILED", "the provider call limit is exhausted")

	resp := f.adminClient.get("/ops/queue?scope=failures")
	requireStatus(t, resp, http.StatusOK, "reading the failure diagnostics")
	if !containsAll(string(resp.Body), id) {
		t.Fatalf("the diagnostics do not name the notification %s: %s", id, resp.Body)
	}
	requireNoUUID(t, resp.Body, "the queue diagnostics")
}
