//go:build integration

package apitest_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type blamedField struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func blamedFields(t *testing.T, resp support.Response) []blamedField {
	t.Helper()
	var body struct {
		Error struct {
			Fields []blamedField `json:"fields"`
		} `json:"error"`
	}
	if err := json.Unmarshal(resp.Body, &body); err != nil {
		t.Fatalf("decoding the error body %s: %v", resp.Body, err)
	}
	return body.Error.Fields
}

func requireBlames(t *testing.T, resp support.Response, field, code, what string) {
	t.Helper()
	for _, blamed := range blamedFields(t, resp) {
		if blamed.Field != field {
			continue
		}
		if blamed.Code != code {
			t.Fatalf("%s: %s carries code %q, want %q", what, field, blamed.Code, code)
		}
		return
	}
	t.Fatalf("%s: nothing blamed %q, body %s", what, field, resp.Body)
}

func TestDeadlineAfterEndNamesTheDeadlineFieldOnCreate(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	end, err := time.Parse(time.RFC3339, eventState(f.AdminClient, t, f.OtherEvent).EndAt)
	if err != nil {
		t.Fatalf("parsing the event end: %v", err)
	}

	resp := f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": end.Add(time.Hour).Format(time.RFC3339),
		})

	requireErrorCode(t, resp, http.StatusConflict, "deadline_after_end",
		"a deadline past the event end")
	requireBlames(t, resp, "deadline_at", "out_of_range", "a deadline past the event end")
}

func TestDeadlineAfterEndNamesTheDeadlineFieldOnUpdate(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	end, err := time.Parse(time.RFC3339, eventState(f.AdminClient, t, f.EventID).EndAt)
	if err != nil {
		t.Fatalf("parsing the event end: %v", err)
	}

	resp := f.AdminClient.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"deadline_at": end.Add(time.Hour).Format(time.RFC3339)})

	requireErrorCode(t, resp, http.StatusConflict, "deadline_after_end",
		"moving the deadline past the event end")
	requireBlames(t, resp, "deadline_at", "out_of_range", "moving the deadline past the event end")
}

func TestADayThatNeverExistedIsRefusedByTheFieldThatHoldsIt(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"end_at": "2026-02-31T10:00:00Z"})

	support.RequireStatus(t, resp, http.StatusBadRequest, "an end on the thirty-first of February")
	requireBlames(t, resp, "end_at", "out_of_range", "an end on the thirty-first of February")
}
