//go:build integration

package apitest_test

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestBatchSetReportsAnUnknownIdentifierAsARowInsteadOfAbortingTheOperation(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	applied := decodeBatch(t,
		batchSet(f.AdminClient, t, f.EventID, "NOT_REQUIRED", f.MemberPart, "pa_zzzzzzzzzzzz"),
		"applying a batch whose second row names a participant that does not exist")

	if len(applied.Results) != 2 {
		t.Fatalf("an unknown identifier collapsed the batch to %d rows: %+v",
			len(applied.Results), applied.Results)
	}
	if applied.Succeeded != 1 || applied.Failed != 1 {
		t.Fatalf("the batch reported succeeded=%d skipped=%d failed=%d instead of 1/0/1",
			applied.Succeeded, applied.Skipped, applied.Failed)
	}
	if applied.Results[1].Key != "pa_zzzzzzzzzzzz" || applied.Results[1].Status != "error" {
		t.Fatalf("the unknown identifier is not reported as its own failed row: %+v", applied.Results[1])
	}
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("the valid row was discarded because a later row named an unknown participant, "+
			"the status is %q", row.Status)
	}
}

func TestBatchSetKeepsMalformedAndUnknownIdentifiersOnTheirOwnRows(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	applied := decodeBatch(t,
		batchSet(f.AdminClient, t, f.EventID, "NOT_REQUIRED", "not-an-id", f.MemberPart, "pa_zzzzzzzzzzzz"),
		"applying a batch carrying a malformed identifier, a valid one and an unknown one")

	if len(applied.Results) != 3 {
		t.Fatalf("a three-item batch returned %d rows: %+v", len(applied.Results), applied.Results)
	}
	if applied.Results[0].Status != "error" || applied.Results[0].Key != "not-an-id" {
		t.Fatalf("the malformed identifier is not reported on its own row: %+v", applied.Results[0])
	}
	if applied.Results[0].Code != "validation_failed" {
		t.Fatalf("a syntactically wrong identifier is reported as %q, want validation_failed: "+
			"a string that is not an identifier at all was never looked up, and saying "+
			"not_found would name the wrong defect", applied.Results[0].Code)
	}
	if !strings.Contains(applied.Results[0].Message, "participant identifier") {
		t.Fatalf("the malformed row does not say what was wrong with it: %q",
			applied.Results[0].Message)
	}
	if applied.Results[1].Status != "ok" {
		t.Fatalf("the valid row between two bad ones did not succeed: %+v", applied.Results[1])
	}
	if applied.Results[2].Status != "error" || applied.Results[2].Code != "not_found" {
		t.Fatalf("a well-formed identifier that matches no row is reported as %+v, "+
			"want a not_found row", applied.Results[2])
	}
	if applied.Succeeded != 1 || applied.Failed != 2 {
		t.Fatalf("the batch reported succeeded=%d failed=%d instead of 1/2",
			applied.Succeeded, applied.Failed)
	}
}

func TestBatchRemovalReportsAnUnknownParticipantAsARow(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	applied := decodeBatch(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/participants/batch-remove",
		map[string]any{"participant_ids": []string{f.MemberPart, "pa_zzzzzzzzzzzz"}}),
		"removing a batch whose second row names a participant that does not exist")

	if len(applied.Results) != 2 {
		t.Fatalf("an unknown identifier collapsed the removal to %d rows: %+v",
			len(applied.Results), applied.Results)
	}
	if applied.Succeeded != 1 || applied.Failed != 1 {
		t.Fatalf("the removal reported succeeded=%d failed=%d instead of 1/1",
			applied.Succeeded, applied.Failed)
	}
	if applied.Results[0].Status != "ok" || applied.Results[1].Status != "error" {
		t.Fatalf("the removal rows are not reported independently: %+v", applied.Results)
	}
}
