//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func notificationsOfEvent(s *support.Stack, t *testing.T, eventID string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM notifications n
		JOIN registration_statuses rs ON rs.id = n.registration_status_id
		WHERE rs.event_id = (SELECT id FROM events WHERE display_id = $1)`, eventID).Scan(&count); err != nil {
		t.Fatalf("counting the notifications of %s: %v", eventID, err)
	}
	return count
}

func statusesOfEvent(s *support.Stack, t *testing.T, eventID string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM registration_statuses
		WHERE event_id = (SELECT id FROM events WHERE display_id = $1)`, eventID).Scan(&count); err != nil {
		t.Fatalf("counting the registration statuses of %s: %v", eventID, err)
	}
	return count
}

func TestRegistrationOnAnUnpublishedEventDefersEveryNotificationUntilPublication(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.AdminClient.CreateEvent(t, "Draft with a registration", start)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+draft+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": f.Member.ID, "team_role": "Developer"}}}),
		http.StatusOK, "assigning the member to the draft")

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+draft+"/registration",
		map[string]any{
			"url":         "https://example.com/draft",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating an active registration on the unpublished event")

	if statuses := statusesOfEvent(s, t, draft); statuses != 1 {
		t.Fatalf("the unpublished event carries %d registration statuses instead of one", statuses)
	}
	if raised := notificationsOfEvent(s, t, draft); raised != 0 {
		t.Fatalf("a registration on an unpublished event raised %d notifications", raised)
	}

	f.AdminClient.Publish(t, draft)

	afterPublish := notificationsOfEvent(s, t, draft)
	if afterPublish != 1 {
		t.Fatalf("publishing raised %d notifications instead of exactly one", afterPublish)
	}

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+draft,
		map[string]any{"title": "Draft with a registration, renamed"}),
		http.StatusOK, "touching the event so reconciliation runs again")

	if again := notificationsOfEvent(s, t, draft); again != afterPublish {
		t.Fatalf("a second reconciliation moved the notification count from %d to %d",
			afterPublish, again)
	}
}

type myEventItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	State string `json:"state"`
	Color *struct {
		Family string `json:"family"`
		Slot   int    `json:"slot"`
	} `json:"color"`
}

func myEvents(c *support.Client, t *testing.T, query string) []myEventItem {
	t.Helper()
	path := "/me/events"
	if query != "" {
		path += "?" + query
	}
	resp := c.Get(path)
	support.RequireStatus(t, resp, http.StatusOK, "reading "+path)
	var body struct {
		Items []myEventItem `json:"items"`
	}
	resp.Decode(t, &body)
	return body.Items
}

func hasEvent(items []myEventItem, id string) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}

func TestMyEventsHidesArchivedUntilAskedAndNeverShowsForeignAssignments(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	now := time.Now().UTC().Truncate(time.Second)
	finished := f.AdminClient.CreateEvent(t, "Finished assignment", now.Add(-30*24*time.Hour))
	archived := f.AdminClient.CreateEvent(t, "Archived assignment", now.Add(48*time.Hour))
	f.AdminClient.Publish(t, finished)
	f.AdminClient.Publish(t, archived)

	for _, id := range []string{finished, archived} {
		support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+id+"/participants/batch-add",
			map[string]any{"items": []map[string]any{{"user_id": f.Member.ID, "team_role": "Developer"}}}),
			http.StatusOK, "assigning the member to "+id)
	}
	support.RequireStatus(t, archive(f.AdminClient, t, archived), http.StatusOK, "archiving one assignment")

	member := s.Session(t, f.Member)

	byDefault := myEvents(member, t, "page_size=100")
	if !hasEvent(byDefault, f.EventID) {
		t.Fatalf("the upcoming assignment is missing from the default view: %+v", byDefault)
	}
	if !hasEvent(byDefault, finished) {
		t.Fatalf("the finished assignment is missing from the default view: %+v", byDefault)
	}
	if hasEvent(byDefault, archived) {
		t.Fatalf("the archived assignment appears in the default view: %+v", byDefault)
	}
	if hasEvent(byDefault, f.OtherEvent) {
		t.Fatalf("an event the member is not assigned to appears in their list: %+v", byDefault)
	}

	withArchived := myEvents(member, t, "page_size=100&include_archived=true")
	if !hasEvent(withArchived, archived) {
		t.Fatalf("the archived assignment is missing even with include_archived: %+v", withArchived)
	}
	if hasEvent(withArchived, f.OtherEvent) {
		t.Fatalf("include_archived revealed an event the member is not assigned to: %+v", withArchived)
	}
}

func TestMyEventsDropsAnAssignmentTheAdministratorRemoved(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	if !hasEvent(myEvents(member, t, "page_size=100"), f.EventID) {
		t.Fatalf("the assignment is missing before the removal")
	}

	support.RequireStatus(t, removeMany(f.AdminClient, t, f.EventID, f.MemberPart),
		http.StatusOK, "removing the member from the roster")

	after := myEvents(member, t, "page_size=100&include_archived=true")
	if hasEvent(after, f.EventID) {
		t.Fatalf("a removed participant still sees the event in their list: %+v", after)
	}

	card := member.Get("/events/" + f.EventID)
	support.RequireStatus(t, card, http.StatusNotFound, "a removed participant reading the event card")
	if !strings.Contains(string(card.Body), "not_found") {
		t.Fatalf("the refusal does not carry the not_found code: %s", card.Body)
	}
}

func TestAdministrativeDeadlineQueriesNameEveryoneByDisplayIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	upcoming := f.AdminClient.Get("/admin/queries/upcoming?within_hours=720")
	support.RequireStatus(t, upcoming, http.StatusOK, "reading the upcoming deadlines")
	if !support.ContainsAll(string(upcoming.Body), f.EventID) {
		t.Fatalf("the upcoming query does not carry the seeded event: %s", upcoming.Body)
	}
	requireNoUUID(t, upcoming.Body, "the upcoming deadline query")

	deadline := registrationState(f.AdminClient, t, f.EventID).DeadlineAt
	parsed, err := time.Parse(time.RFC3339, deadline)
	if err != nil {
		t.Fatalf("parsing the registration deadline: %v", err)
	}
	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"deadline_at": parsed.Add(-48 * time.Hour).Format(time.RFC3339)}),
		http.StatusOK, "moving the deadline into the past")

	overdue := f.AdminClient.Get("/admin/queries/overdue")
	support.RequireStatus(t, overdue, http.StatusOK, "reading the overdue deadlines")
	if !support.ContainsAll(string(overdue.Body), f.EventID) {
		t.Fatalf("the overdue query does not carry the seeded event: %s", overdue.Body)
	}
	requireNoUUID(t, overdue.Body, "the overdue deadline query")
}

func TestAdministrativeReadSurfacesNeverExposeAnInternalIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, path := range []string{
		"/admin/events",
		"/admin/events/" + f.EventID,
		"/admin/events/" + f.EventID + "/participants",
		"/admin/events/" + f.EventID + "/registration",
		"/admin/events/" + f.EventID + "/registration/rules",
		"/admin/events/" + f.EventID + "/registration-statuses",
		"/events/" + f.EventID + "/stages",
		"/admin/users",
		"/admin/invites",
		"/admin/queries/upcoming?within_hours=720",
		"/admin/queries/overdue",
	} {
		t.Run(path, func(t *testing.T) {
			resp := f.AdminClient.Get(path)
			support.RequireStatus(t, resp, http.StatusOK, "reading "+path)
			requireNoUUID(t, resp.Body, path)
		})
	}
}
