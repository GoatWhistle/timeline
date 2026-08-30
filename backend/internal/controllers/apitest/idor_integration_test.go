//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

func TestForeignEventIsHiddenFromOutsider(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	outsider := s.session(t, f.outsider)

	card := outsider.get("/events/" + f.eventID.String())
	requireStatus(t, card, http.StatusNotFound, "reading a foreign event card")

	unknown := outsider.get("/events/" + uuid.NewString())
	requireStatus(t, unknown, http.StatusNotFound, "reading a nonexistent event card")

	if card.errorCode(t) != unknown.errorCode(t) {
		t.Fatalf("a foreign event is distinguishable from a missing one: %s versus %s",
			card.Body, unknown.Body)
	}

	stages := outsider.get("/events/" + f.eventID.String() + "/stages")
	requireStatus(t, stages, http.StatusNotFound, "reading foreign stages")
}

func TestMarkDoneOnForeignEventIsRejected(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	before := member.get("/events/" + f.eventID.String())
	requireStatus(t, before, http.StatusOK, "the member reads their own card")
	if !containsAll(string(before.Body), `"status":"TODO"`) {
		t.Fatalf("the member status is not TODO before the attempt: %s", before.Body)
	}

	outsider := s.session(t, f.outsider)
	resp := outsider.post("/events/"+f.eventID.String()+"/registration/done", nil)
	requireStatus(t, resp, http.StatusNotFound, "self-reporting on a foreign event")

	after := member.get("/events/" + f.eventID.String())
	if !containsAll(string(after.Body), `"status":"TODO"`) {
		t.Fatalf("the rejected foreign attempt changed the member status: %s", after.Body)
	}

	own := member.post("/events/"+f.eventID.String()+"/registration/done", nil)
	requireStatus(t, own, http.StatusOK, "the member self-reports on their own event")
	if !containsAll(string(own.Body), `"status":"DONE"`) {
		t.Fatalf("the member's own self-report did not take effect: %s", own.Body)
	}
}

func TestAdminNotesAreInvisibleToParticipant(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	card := member.get("/events/" + f.eventID.String())
	requireStatus(t, card, http.StatusOK, "the member reads their own card")
	requireNoBodyField(t, card, "notes", "the participant event card")

	catalog := member.get("/catalog")
	requireStatus(t, catalog, http.StatusOK, "the member reads the catalog")
	requireNoBodyField(t, catalog, "notes", "the catalog")

	adminView := f.adminClient.get("/admin/events/" + f.eventID.String())
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
			"/admin/participants/" + f.memberPart.String() + "/team-role",
			map[string]any{"team_role": "Hijacked"}},
		{"reactivation of a foreign participant", http.MethodPost,
			"/admin/participants/" + f.memberPart.String() + "/reactivate", nil},
		{"status of a foreign participant", http.MethodPatch,
			"/admin/registration-statuses/" + f.statusID.String(),
			map[string]any{"status": "DONE"}},
		{"reminder rule of a foreign event", http.MethodPatch,
			"/admin/registration-rules/" + f.regRuleID.String(),
			map[string]any{"enabled": false}},
		{"roster of a foreign event", http.MethodGet,
			"/admin/events/" + f.eventID.String() + "/participants", nil},
		{"statuses of a foreign event", http.MethodGet,
			"/admin/events/" + f.eventID.String() + "/registration-statuses", nil},
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

	roster := f.adminClient.get("/admin/events/" + f.eventID.String() + "/participants")
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
	if !containsAll(string(me.Body), f.member.ID.String()) {
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
	if !containsAll(string(theirs.Body), f.outsider.ID.String()) {
		t.Fatalf("/me returned a different account for the outsider: %s", theirs.Body)
	}

	requireNoBodyField(t, me, "password_hash", "/me")
	requireNoBodyField(t, me, "telegram_chat_id", "/me")
}
