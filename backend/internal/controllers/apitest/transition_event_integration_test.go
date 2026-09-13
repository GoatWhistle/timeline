//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestEventUnpublishedToPublishedIsAdminOnlyAndNotRepeatable(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.AdminClient.CreateEvent(t, "Draft event", start)

	if state := eventState(f.AdminClient, t, draft).State; state != "UNPUBLISHED" {
		t.Fatalf("a fresh event is %q instead of UNPUBLISHED", state)
	}
	if items := support.Catalog(t, s.Session(t, f.Outsider), "page_size=100"); containsEvent(items, draft) {
		t.Fatalf("an unpublished event is visible in the catalog")
	}

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/admin/events/"+draft+"/publish", nil),
		http.StatusForbidden, "forbidden", "a participant publishing an event")
	if state := eventState(f.AdminClient, t, draft).State; state != "UNPUBLISHED" {
		t.Fatalf("the refused attempt moved the event to %q", state)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+draft+"/publish", nil),
		http.StatusOK, "publishing the draft")
	published := eventState(f.AdminClient, t, draft)
	if published.PublishedAt == nil {
		t.Fatalf("published_at stayed empty after publishing: %+v", published)
	}
	if items := support.Catalog(t, s.Session(t, f.Outsider), "page_size=100"); !containsEvent(items, draft) {
		t.Fatalf("a published event is missing from the catalog")
	}

	requireErrorCode(t, f.AdminClient.Post("/admin/events/"+draft+"/publish", nil),
		http.StatusConflict, "invalid_state_transition", "publishing an already published event")
}

func TestEventArchivedIsTerminalAndCancelsPending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	seedPending(f, t, s)

	member := s.Session(t, f.Member)
	requireErrorCode(t, archive(member, t, f.EventID),
		http.StatusForbidden, "forbidden", "a participant archiving an event")
	if state := eventState(f.AdminClient, t, f.EventID).State; state == "ARCHIVED" {
		t.Fatalf("the refused attempt archived the event")
	}

	support.RequireStatus(t, archive(f.AdminClient, t, f.EventID), http.StatusOK, "archiving a published event")
	archived := eventState(f.AdminClient, t, f.EventID)
	if archived.ArchivedAt == nil || archived.State != "ARCHIVED" {
		t.Fatalf("the event did not reach ARCHIVED: %+v", archived)
	}
	if pending := notificationCount(s, t, f.EventID, "PENDING"); pending != 0 {
		t.Fatalf("archiving left %d pending notifications", pending)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled == 0 {
		t.Fatalf("archiving cancelled nothing")
	}

	requireErrorCode(t, archive(f.AdminClient, t, f.EventID),
		http.StatusConflict, "invalid_state_transition", "archiving an already archived event")
	requireErrorCode(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/publish", nil),
		http.StatusConflict, "invalid_state_transition", "publishing an archived event")
	requireErrorCode(t, f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"title": "Renamed after archiving"}),
		http.StatusConflict, "invalid_state_transition", "editing an archived event")
}

func TestUnpublishedEventArchivesDirectly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.AdminClient.CreateEvent(t, "Draft to archive", start)

	support.RequireStatus(t, archive(f.AdminClient, t, draft), http.StatusOK, "archiving an unpublished event")
	archived := eventState(f.AdminClient, t, draft)
	if archived.State != "ARCHIVED" || archived.PublishedAt != nil {
		t.Fatalf("the draft did not archive without publication: %+v", archived)
	}
}

func TestEventEndChangeBumpsScheduleVersionAndCancelsPending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	seedPending(f, t, s)
	before := registrationState(f.AdminClient, t, f.EventID)
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	current := eventState(f.AdminClient, t, f.EventID)
	end, err := time.Parse(time.RFC3339, current.EndAt)
	if err != nil {
		t.Fatalf("parsing the event end: %v", err)
	}
	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"end_at": end.Add(24 * time.Hour).Format(time.RFC3339)}),
		http.StatusOK, "moving the event end later")

	after := registrationState(f.AdminClient, t, f.EventID)
	if after.ScheduleVersion != before.ScheduleVersion+1 {
		t.Fatalf("schedule_version went from %d to %d instead of +1",
			before.ScheduleVersion, after.ScheduleVersion)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("moving the event end cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if pending := notificationCount(s, t, f.EventID, "PENDING"); pending != 0 {
		t.Fatalf("moving the event end left %d pending notifications on the old schedule", pending)
	}
}

func TestEventEndCannotMoveBeforeTheRegistrationDeadline(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	before := registrationState(f.AdminClient, t, f.EventID)
	deadline, err := time.Parse(time.RFC3339, before.DeadlineAt)
	if err != nil {
		t.Fatalf("parsing the registration deadline: %v", err)
	}

	resp := f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"end_at": deadline.Add(-time.Hour).Format(time.RFC3339)})
	if resp.Status == http.StatusOK {
		t.Fatalf("the event end moved before the registration deadline: %s", resp.Body)
	}
	if resp.Status >= http.StatusInternalServerError {
		t.Fatalf("moving the end before the deadline produced %d instead of a domain refusal: %s",
			resp.Status, resp.Body)
	}
	if after := registrationState(f.AdminClient, t, f.EventID); after.ScheduleVersion != before.ScheduleVersion {
		t.Fatalf("the refused change still bumped schedule_version from %d to %d",
			before.ScheduleVersion, after.ScheduleVersion)
	}
}

func TestPublishBackfillsNotificationsForParticipantsAssignedToADraft(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.AdminClient.CreateEvent(t, "Draft with participants first", start)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+draft+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the registration on the draft")

	recruit := s.Register(t, "recruit-"+support.Nickname()+"@example.com")
	addResp := f.AdminClient.Post("/admin/events/"+draft+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": recruit.ID, "team_role": "Developer"}}})
	support.RequireStatus(t, addResp, http.StatusOK, "assigning a participant to the draft")

	if before := notificationCount(s, t, draft, "PENDING") + notificationCount(s, t, draft, "SENT") +
		notificationCount(s, t, draft, "PROCESSING") + notificationCount(s, t, draft, "UNDELIVERABLE"); before != 0 {
		t.Fatalf("assigning a participant to a draft must not create notifications yet, found %d", before)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+draft+"/publish", nil),
		http.StatusOK, "publishing the draft with a participant already assigned")

	after := notificationCount(s, t, draft, "PENDING") + notificationCount(s, t, draft, "SENT") +
		notificationCount(s, t, draft, "PROCESSING") + notificationCount(s, t, draft, "UNDELIVERABLE")
	if after == 0 {
		t.Fatalf("publishing a draft did not backfill a notification for the already assigned participant")
	}
}

func containsEvent(items []support.CatalogItem, id string) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}
