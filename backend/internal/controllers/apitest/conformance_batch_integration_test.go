//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type batchResult struct {
	Succeeded int `json:"succeeded"`
	Skipped   int `json:"skipped"`
	Failed    int `json:"failed"`
	Results   []struct {
		Index   int    `json:"index"`
		Key     string `json:"key"`
		ID      string `json:"id"`
		Status  string `json:"status"`
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"results"`
}

type previewResult struct {
	Affected int `json:"affected"`
	Skipped  int `json:"skipped"`
}

func batchSet(c *support.Client, t *testing.T, eventID, status string, ids ...string) support.Response {
	t.Helper()
	return c.Post("/admin/events/"+eventID+"/registration-statuses/batch-set",
		map[string]any{"participant_ids": ids, "status": status})
}

func batchPreview(c *support.Client, t *testing.T, eventID, status string, ids ...string) support.Response {
	t.Helper()
	return c.Post("/admin/events/"+eventID+"/registration-statuses/batch-set/preview",
		map[string]any{"participant_ids": ids, "status": status})
}

func decodeBatch(t *testing.T, resp support.Response, what string) batchResult {
	t.Helper()
	support.RequireStatus(t, resp, http.StatusOK, what)
	var body batchResult
	resp.Decode(t, &body)
	return body
}

func decodePreview(t *testing.T, resp support.Response, what string) previewResult {
	t.Helper()
	support.RequireStatus(t, resp, http.StatusOK, what)
	var body previewResult
	resp.Decode(t, &body)
	return body
}

func foreignParticipant(s *support.Stack, f support.Fixture, t *testing.T) string {
	t.Helper()
	stray := s.Register(t, "stray-"+support.Nickname()+"@example.com")
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/participants/batch-add",
		map[string]any{"items": []map[string]any{{"user_id": stray.ID, "team_role": "Developer"}}}),
		http.StatusOK, "assigning a participant to the foreign event")

	resp := f.AdminClient.Get("/admin/events/" + f.OtherEvent + "/participants")
	support.RequireStatus(t, resp, http.StatusOK, "listing the roster of the foreign event")
	var roster struct {
		Items []struct {
			ID   string `json:"id"`
			User struct {
				ID string `json:"id"`
			} `json:"user"`
		} `json:"items"`
	}
	resp.Decode(t, &roster)
	for _, item := range roster.Items {
		if item.User.ID == stray.ID {
			return item.ID
		}
	}
	t.Fatalf("the stray participant is missing from the foreign roster: %s", resp.Body)
	return ""
}

func TestBatchSetPreviewPredictsTheOperationForANoOpChange(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")

	preview := decodePreview(t, batchPreview(f.AdminClient, t, f.EventID, "NOT_REQUIRED", f.MemberPart),
		"previewing a status the participant already holds")
	applied := decodeBatch(t, batchSet(f.AdminClient, t, f.EventID, "NOT_REQUIRED", f.MemberPart),
		"applying a status the participant already holds")

	if preview.Affected != 0 || preview.Skipped != 1 {
		t.Fatalf("the preview of a no-op change reports affected=%d skipped=%d instead of 0 and 1",
			preview.Affected, preview.Skipped)
	}
	if applied.Succeeded != preview.Affected || applied.Skipped != preview.Skipped {
		t.Fatalf("the preview promised affected=%d skipped=%d, the operation reported succeeded=%d skipped=%d failed=%d",
			preview.Affected, preview.Skipped, applied.Succeeded, applied.Skipped, applied.Failed)
	}
	if len(applied.Results) != 1 || applied.Results[0].Status != "skipped" {
		t.Fatalf("a no-op change is not reported as a skipped row: %+v", applied.Results)
	}
}

func TestBatchSetRefusesAParticipantOfAnotherEventWithoutTouchingTheRoster(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	strayPart := foreignParticipant(s, f, t)

	preview := decodePreview(t, batchPreview(f.AdminClient, t, f.EventID, "NOT_REQUIRED", strayPart),
		"previewing a participant that belongs to another event")
	applied := decodeBatch(t, batchSet(f.AdminClient, t, f.EventID, "NOT_REQUIRED", strayPart),
		"applying to a participant that belongs to another event")

	if applied.Failed != 1 || len(applied.Results) != 1 || applied.Results[0].Code != "not_found" {
		t.Fatalf("a participant of another event is not reported as a failed row: %+v", applied)
	}
	if preview.Affected != 0 {
		t.Fatalf("the preview counts a participant of another event as affected=%d", preview.Affected)
	}
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the cross-event batch changed the member status to %q", row.Status)
	}
}

func TestBatchSetReportsEveryRowAndKeepsThePartialFailureAtTwoHundred(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	strayPart := foreignParticipant(s, f, t)

	applied := decodeBatch(t, batchSet(f.AdminClient, t, f.EventID, "NOT_REQUIRED", f.MemberPart, strayPart),
		"applying a batch where one row is valid and one belongs to another event")

	if len(applied.Results) != 2 {
		t.Fatalf("a two-item batch returned %d rows: %+v", len(applied.Results), applied.Results)
	}
	if applied.Results[0].Index != 0 || applied.Results[1].Index != 1 {
		t.Fatalf("the batch rows are not indexed in request order: %+v", applied.Results)
	}
	if applied.Results[0].Key != f.MemberPart || applied.Results[1].Key != strayPart {
		t.Fatalf("the batch rows do not carry the requested keys: %+v", applied.Results)
	}
	if applied.Succeeded != 1 || applied.Failed != 1 {
		t.Fatalf("a partially failing batch reported succeeded=%d skipped=%d failed=%d",
			applied.Succeeded, applied.Skipped, applied.Failed)
	}
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("the valid row of a partially failing batch was rolled back, the status is %q", row.Status)
	}
}

func TestBatchAssignmentReportsTheConflictingRowApart(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	second := s.Register(t, "second-"+support.Nickname()+"@example.com")
	third := s.Register(t, "third-"+support.Nickname()+"@example.com")

	resp := f.AdminClient.Post("/admin/events/"+f.EventID+"/participants/batch-add",
		map[string]any{"items": []map[string]any{
			{"user_id": second.ID, "team_role": "Developer"},
			{"user_id": f.Member.ID, "team_role": "Developer"},
			{"user_id": third.ID, "team_role": "Developer"},
		}})
	applied := decodeBatch(t, resp, "assigning three users of whom one is already assigned")

	if applied.Succeeded != 2 || applied.Skipped != 1 || applied.Failed != 0 {
		t.Fatalf("the batch reported succeeded=%d skipped=%d failed=%d instead of 2/1/0",
			applied.Succeeded, applied.Skipped, applied.Failed)
	}
	if len(applied.Results) != 3 {
		t.Fatalf("a three-item batch returned %d rows: %+v", len(applied.Results), applied.Results)
	}
	if applied.Results[1].Status != "skipped" || applied.Results[1].Code != "already_assigned" {
		t.Fatalf("the already assigned row is not reported as a skipped conflict: %+v", applied.Results[1])
	}
	if applied.Results[0].Status != "ok" || applied.Results[2].Status != "ok" {
		t.Fatalf("the two fresh rows did not both succeed: %+v", applied.Results)
	}

	roster := f.AdminClient.Get("/admin/events/" + f.EventID + "/participants")
	support.RequireStatus(t, roster, http.StatusOK, "listing the roster after the batch")
	if !support.ContainsAll(string(roster.Body), second.ID, third.ID, f.Member.ID) {
		t.Fatalf("the roster does not carry all three users: %s", roster.Body)
	}
}
