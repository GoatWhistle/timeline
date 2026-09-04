//go:build integration

package eventtest_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestJoinTellsNothingApartAnUnpublishedEventFromAMissingOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	hidden := f.AdminClient.CreateEvent(t, "An event kept out of the catalogue", start)

	outsider := s.Session(t, f.Outsider)

	existing := outsider.Post("/events/"+hidden+"/join", nil)
	missing := outsider.Post("/events/"+support.MissingEventID+"/join", nil)

	if existing.Status != missing.Status {
		t.Fatalf("joining an unpublished event answered %d while a missing one answered %d: "+
			"the status alone tells an outsider the event exists",
			existing.Status, missing.Status)
	}
	if existing.ErrorCode(t) != missing.ErrorCode(t) {
		t.Fatalf("joining an unpublished event answered %q while a missing one answered %q: "+
			"the error code alone tells an outsider the event exists",
			existing.ErrorCode(t), missing.ErrorCode(t))
	}
}
