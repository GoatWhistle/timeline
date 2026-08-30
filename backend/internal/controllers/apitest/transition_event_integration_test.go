//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestEventUnpublishedToPublishedIsAdminOnlyAndNotRepeatable(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.adminClient.createEvent(t, "Draft event", start)

	if state := f.adminClient.eventState(t, draft).State; state != "UNPUBLISHED" {
		t.Fatalf("a fresh event is %q instead of UNPUBLISHED", state)
	}
	if items := s.session(t, f.outsider).catalog(t, "page_size=100"); containsEvent(items, draft) {
		t.Fatalf("an unpublished event is visible in the catalog")
	}

	member := s.session(t, f.member)
	requireErrorCode(t, member.post("/admin/events/"+draft.String()+"/publish", nil),
		http.StatusForbidden, "forbidden", "a participant publishing an event")
	if state := f.adminClient.eventState(t, draft).State; state != "UNPUBLISHED" {
		t.Fatalf("the refused attempt moved the event to %q", state)
	}

	requireStatus(t, f.adminClient.post("/admin/events/"+draft.String()+"/publish", nil),
		http.StatusOK, "publishing the draft")
	published := f.adminClient.eventState(t, draft)
	if published.PublishedAt == nil {
		t.Fatalf("published_at stayed empty after publishing: %+v", published)
	}
	if items := s.session(t, f.outsider).catalog(t, "page_size=100"); !containsEvent(items, draft) {
		t.Fatalf("a published event is missing from the catalog")
	}

	requireErrorCode(t, f.adminClient.post("/admin/events/"+draft.String()+"/publish", nil),
		http.StatusConflict, "invalid_state_transition", "publishing an already published event")
}

func TestEventArchivedIsTerminalAndCancelsPending(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)

	member := s.session(t, f.member)
	requireErrorCode(t, member.archive(t, f.eventID),
		http.StatusForbidden, "forbidden", "a participant archiving an event")
	if state := f.adminClient.eventState(t, f.eventID).State; state == "ARCHIVED" {
		t.Fatalf("the refused attempt archived the event")
	}

	requireStatus(t, f.adminClient.archive(t, f.eventID), http.StatusOK, "archiving a published event")
	archived := f.adminClient.eventState(t, f.eventID)
	if archived.ArchivedAt == nil || archived.State != "ARCHIVED" {
		t.Fatalf("the event did not reach ARCHIVED: %+v", archived)
	}
	if pending := s.notificationCount(t, f.eventID, "PENDING"); pending != 0 {
		t.Fatalf("archiving left %d pending notifications", pending)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled == 0 {
		t.Fatalf("archiving cancelled nothing")
	}

	requireErrorCode(t, f.adminClient.archive(t, f.eventID),
		http.StatusConflict, "invalid_state_transition", "archiving an already archived event")
	requireErrorCode(t, f.adminClient.post("/admin/events/"+f.eventID.String()+"/publish", nil),
		http.StatusConflict, "invalid_state_transition", "publishing an archived event")
	requireErrorCode(t, f.adminClient.patch("/admin/events/"+f.eventID.String(),
		map[string]any{"title": "Renamed after archiving"}),
		http.StatusConflict, "invalid_state_transition", "editing an archived event")
}

func TestUnpublishedEventArchivesDirectly(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	draft := f.adminClient.createEvent(t, "Draft to archive", start)

	requireStatus(t, f.adminClient.archive(t, draft), http.StatusOK, "archiving an unpublished event")
	archived := f.adminClient.eventState(t, draft)
	if archived.State != "ARCHIVED" || archived.PublishedAt != nil {
		t.Fatalf("the draft did not archive without publication: %+v", archived)
	}
}

func TestEventEndChangeBumpsScheduleVersionAndCancelsPending(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	before := f.adminClient.registrationState(t, f.eventID)
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	current := f.adminClient.eventState(t, f.eventID)
	end, err := time.Parse(time.RFC3339, current.EndAt)
	if err != nil {
		t.Fatalf("parsing the event end: %v", err)
	}
	requireStatus(t, f.adminClient.patch("/admin/events/"+f.eventID.String(),
		map[string]any{"end_at": end.Add(24 * time.Hour).Format(time.RFC3339)}),
		http.StatusOK, "moving the event end later")

	after := f.adminClient.registrationState(t, f.eventID)
	if after.ScheduleVersion != before.ScheduleVersion+1 {
		t.Fatalf("schedule_version went from %d to %d instead of +1",
			before.ScheduleVersion, after.ScheduleVersion)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("moving the event end cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if pending := s.notificationCount(t, f.eventID, "PENDING"); pending != 0 {
		t.Fatalf("moving the event end left %d pending notifications on the old schedule", pending)
	}
}

func TestEventEndCannotMoveBeforeTheRegistrationDeadline(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	before := f.adminClient.registrationState(t, f.eventID)
	deadline, err := time.Parse(time.RFC3339, before.DeadlineAt)
	if err != nil {
		t.Fatalf("parsing the registration deadline: %v", err)
	}

	resp := f.adminClient.patch("/admin/events/"+f.eventID.String(),
		map[string]any{"end_at": deadline.Add(-time.Hour).Format(time.RFC3339)})
	if resp.Status == http.StatusOK {
		t.Fatalf("the event end moved before the registration deadline: %s", resp.Body)
	}
	if resp.Status >= http.StatusInternalServerError {
		t.Fatalf("moving the end before the deadline produced %d instead of a domain refusal: %s",
			resp.Status, resp.Body)
	}
	if after := f.adminClient.registrationState(t, f.eventID); after.ScheduleVersion != before.ScheduleVersion {
		t.Fatalf("the refused change still bumped schedule_version from %d to %d",
			before.ScheduleVersion, after.ScheduleVersion)
	}
}

func containsEvent(items []catalogItem, id uuid.UUID) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}
