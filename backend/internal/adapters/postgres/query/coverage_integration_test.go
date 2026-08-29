//go:build integration

package query_test

import (
	"context"
	"math"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestCoverageIsNotApplicableWithoutAnyActiveRegistration(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	f.event("Event without registration", true, false)

	disabled := f.event("Event with a disabled registration", true, false)
	registration := f.registration(disabled, "DISABLED")
	f.assign(disabled, registration, "waived@example.com", "TODO")

	got := coverage(t, pool)
	if got.Applicable {
		t.Fatalf("no event requires registration, applicable must be false: %+v", got)
	}
	if got.Share != nil {
		t.Fatalf("share must be omitted when nothing requires registration, got %v", *got.Share)
	}
	if got.Total != 0 {
		t.Fatalf("total must be zero, got %d", got.Total)
	}
}

func TestCoverageCountsSelfReportedAndWaivedAsCovered(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	event := f.event("Event with a registration", true, false)
	registration := f.registration(event, "ACTIVE")
	f.assign(event, registration, "done@example.com", "DONE")
	f.assign(event, registration, "waived@example.com", "NOT_REQUIRED")
	f.assign(event, registration, "todo@example.com", "TODO")

	got := coverage(t, pool)
	if !got.Applicable {
		t.Fatalf("an active registration makes the aggregate applicable: %+v", got)
	}
	if got.Total != 3 || got.SelfReportedDone != 1 || got.NotRequired != 1 || got.Outstanding != 1 {
		t.Fatalf("unexpected breakdown: %+v", got)
	}
	if got.EventsCovered != 1 {
		t.Fatalf("one event carries a registration, got %d", got.EventsCovered)
	}
	if got.Share == nil || math.Abs(*got.Share-2.0/3.0) > 1e-9 {
		t.Fatalf("share must be 2/3, got %+v", got.Share)
	}
}

func TestCoverageStaysBelowOneWhileAnyoneIsOutstanding(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	event := f.event("Almost covered", true, false)
	registration := f.registration(event, "ACTIVE")
	for _, email := range []string{"a@example.com", "b@example.com", "c@example.com"} {
		f.assign(event, registration, email, "DONE")
	}
	f.assign(event, registration, "last@example.com", "TODO")

	got := coverage(t, pool)
	if got.Share == nil {
		t.Fatal("share must be present")
	}
	if *got.Share >= 1 {
		t.Fatalf("one participant is still outstanding, share must stay below one, got %v", *got.Share)
	}
	if got.Outstanding != 1 {
		t.Fatalf("expected one outstanding participant, got %d", got.Outstanding)
	}
}

func TestCoverageExcludesRemovedParticipantsAndInactiveAccounts(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	event := f.event("Mixed roster", true, false)
	registration := f.registration(event, "ACTIVE")
	f.assign(event, registration, "counted@example.com", "DONE")

	removedUser := f.user("removed@example.com", true, false)
	removed := f.participant(event, removedUser, "REMOVED")
	f.status(event, registration, removed, "TODO")

	inactiveUser := f.user("inactive@example.com", false, false)
	inactive := f.participant(event, inactiveUser, "ASSIGNED")
	f.status(event, registration, inactive, "TODO")

	deletedUser := f.user("deleted@example.com", true, true)
	deleted := f.participant(event, deletedUser, "ASSIGNED")
	f.status(event, registration, deleted, "TODO")

	got := coverage(t, pool)
	if got.Total != 1 || got.Outstanding != 0 {
		t.Fatalf("only the assigned active account counts: %+v", got)
	}
	if got.Share == nil || *got.Share != 1 {
		t.Fatalf("the single counted participant is covered, got %+v", got.Share)
	}
}

func TestCoverageIgnoresUnpublishedAndArchivedEvents(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	unpublished := f.event("Draft", false, false)
	draftReg := f.registration(unpublished, "ACTIVE")
	f.assign(unpublished, draftReg, "draft@example.com", "TODO")

	archived := f.event("Archived", true, true)
	archivedReg := f.registration(archived, "ACTIVE")
	f.assign(archived, archivedReg, "archived@example.com", "TODO")

	got := coverage(t, pool)
	if got.Applicable || got.Total != 0 {
		t.Fatalf("neither a draft nor an archived event contributes: %+v", got)
	}
}

func TestCoverageCountsEveryEventThatRequiresRegistration(t *testing.T) {
	pool := testsupport.Pool(t)
	f := newCoverageFixture(t, pool)

	first := f.event("First", true, false)
	firstReg := f.registration(first, "ACTIVE")
	f.assign(first, firstReg, "first@example.com", "DONE")

	second := f.event("Second", true, false)
	secondReg := f.registration(second, "ACTIVE")
	f.assign(second, secondReg, "second@example.com", "TODO")

	got := coverage(t, pool)
	if got.EventsCovered != 2 {
		t.Fatalf("expected two events, got %d", got.EventsCovered)
	}
	if got.Total != 2 || got.SelfReportedDone != 1 || got.Outstanding != 1 {
		t.Fatalf("unexpected breakdown across events: %+v", got)
	}
}

func coverage(t *testing.T, pool *pgxpool.Pool) models.RegistrationCoverage {
	t.Helper()
	got, err := query.NewTimeline(postgres.NewDB(pool)).RegistrationCoverage(context.Background())
	if err != nil {
		t.Fatalf("reading the coverage aggregate: %v", err)
	}
	return got
}
