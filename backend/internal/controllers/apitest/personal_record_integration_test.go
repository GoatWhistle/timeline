//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

const (
	personalTaskTitle = "Record the demo video"
	personalNoteBody  = "private draft nobody else may read"
)

type personalRecords struct {
	taskID     string
	artifactID string
}

func put(c *support.Client, path string, body any) support.Response {
	return c.Mutate(http.MethodPut, path, body)
}

func seedPersonal(c *support.Client, t *testing.T, eventID string) personalRecords {
	t.Helper()

	taskResp := c.Post("/me/events/"+eventID+"/tasks",
		map[string]any{"title": personalTaskTitle})
	support.RequireStatus(t, taskResp, http.StatusCreated, "creating a personal task")
	var task struct {
		ID string `json:"id"`
	}
	taskResp.Decode(t, &task)

	support.RequireStatus(t, put(c, "/me/events/"+eventID+"/note",
		map[string]any{"body": personalNoteBody}), http.StatusOK, "saving a personal note")

	artifactResp := c.Post("/me/events/"+eventID+"/artifacts",
		map[string]any{"kind": "REPOSITORY", "url": "https://example.com/repo"})
	support.RequireStatus(t, artifactResp, http.StatusCreated, "creating an artifact")
	var artifact struct {
		ID string `json:"id"`
	}
	artifactResp.Decode(t, &artifact)

	support.RequireStatus(t, put(c, "/me/events/"+eventID+"/outcome",
		map[string]any{"outcome": "WINNER", "place": 1}), http.StatusOK, "recording an outcome")

	support.RequireStatus(t, put(c, "/me/bookmarks/"+eventID, nil),
		http.StatusNoContent, "bookmarking the event")

	return personalRecords{taskID: task.ID, artifactID: artifact.ID}
}

func assign(c *support.Client, t *testing.T, eventID, userID string) {
	t.Helper()
	resp := c.Post("/admin/events/"+eventID+"/participants/batch-add",
		map[string]any{"items": []map[string]any{
			{"user_id": userID, "team_role": "Developer"},
		}})
	support.RequireStatus(t, resp, http.StatusOK, "assigning a participant")
	if !support.ContainsAll(string(resp.Body), `"succeeded":1`) {
		t.Fatalf("assigning a participant did not succeed: %s", resp.Body)
	}
}

func TestEmptyNoteDeletesTheRecord(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	blank := member.Get("/me/events/" + f.EventID + "/note")
	support.RequireStatus(t, blank, http.StatusOK, "reading a note that was never written")
	if !support.ContainsAll(string(blank.Body), `"body":""`) {
		t.Fatalf("a missing note is not answered with an empty body: %s", blank.Body)
	}

	markdown := "# Plan\n\n- [ ] talk to the mentor"
	saved := put(member, "/me/events/"+f.EventID+"/note",
		map[string]any{"body": markdown})
	support.RequireStatus(t, saved, http.StatusOK, "saving a note")

	read := member.Get("/me/events/" + f.EventID + "/note")
	var note struct {
		Body string `json:"body"`
	}
	read.Decode(t, &note)
	if note.Body != markdown {
		t.Fatalf("the server did not return the Markdown source verbatim: %q", note.Body)
	}

	support.RequireStatus(t, put(member, "/me/events/"+f.EventID+"/note",
		map[string]any{"body": "   "}), http.StatusOK, "saving a blank note")

	after := member.Get("/me/events/" + f.EventID + "/note")
	after.Decode(t, &note)
	if note.Body != "" {
		t.Fatalf("a blank save left the note behind: %q", note.Body)
	}
	if countRows(s, t, "participant_notes") != 0 {
		t.Fatalf("a blank save kept an empty row in participant_notes")
	}
}

func TestOutcomeDefaultsToParticipatedAndGuardsPlace(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	plain := put(member, "/me/events/"+f.EventID+"/outcome", map[string]any{})
	support.RequireStatus(t, plain, http.StatusOK, "recording an outcome without a value")
	if !support.ContainsAll(string(plain.Body), `"outcome":"PARTICIPATED"`) {
		t.Fatalf("the default outcome is not PARTICIPATED: %s", plain.Body)
	}
	if strings.Contains(string(plain.Body), `"place"`) {
		t.Fatalf("a default outcome carries a place: %s", plain.Body)
	}

	bad := put(member, "/me/events/"+f.EventID+"/outcome",
		map[string]any{"outcome": "PARTICIPATED", "place": 1})
	support.RequireStatus(t, bad, http.StatusBadRequest, "a place alongside PARTICIPATED")

	good := put(member, "/me/events/"+f.EventID+"/outcome",
		map[string]any{"outcome": "WINNER", "place": 1, "track": "Smart city"})
	support.RequireStatus(t, good, http.StatusOK, "a place alongside WINNER")
	if !support.ContainsAll(string(good.Body), `"outcome":"WINNER"`, `"place":1`) {
		t.Fatalf("the placing outcome was not stored: %s", good.Body)
	}
}

func TestBookmarkIsNotParticipation(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	outsider := s.Session(t, f.Outsider)
	participantsBefore := countRows(s, t, "event_participants")
	statusesBefore := countRows(s, t, "registration_statuses")
	notifyBefore := countRows(s, t, "notifications")

	support.RequireStatus(t, put(outsider, "/me/bookmarks/"+f.EventID, nil),
		http.StatusNoContent, "bookmarking an event the caller has not joined")
	support.RequireStatus(t, put(outsider, "/me/bookmarks/"+f.EventID, nil),
		http.StatusNoContent, "bookmarking the same event again")

	if after := countRows(s, t, "event_participants"); after != participantsBefore {
		t.Fatalf("bookmarking created a participant assignment")
	}
	if after := countRows(s, t, "registration_statuses"); after != statusesBefore {
		t.Fatalf("bookmarking created a registration status")
	}
	if after := countRows(s, t, "notifications"); after != notifyBefore {
		t.Fatalf("bookmarking queued a notification")
	}
	if total := countRows(s, t, "event_bookmarks"); total != 1 {
		t.Fatalf("bookmarking twice produced %d rows, expected 1", total)
	}

	list := outsider.Get("/me/bookmarks")
	support.RequireStatus(t, list, http.StatusOK, "listing bookmarks")
	if !support.ContainsAll(string(list.Body), f.EventID, `"joined":false`) {
		t.Fatalf("the bookmark listing does not show the event as not joined: %s", list.Body)
	}

	support.RequireStatus(t, outsider.Delete("/me/bookmarks/"+f.EventID),
		http.StatusNoContent, "removing the bookmark")
	support.RequireStatus(t, outsider.Delete("/me/bookmarks/"+f.EventID),
		http.StatusNotFound, "removing a bookmark that is already gone")
}

func TestHistoryShowsOnlyOwnRecords(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	seedPersonal(member, t, f.EventID)

	history := member.Get("/me/history")
	support.RequireStatus(t, history, http.StatusOK, "reading own history")
	if !support.ContainsAll(string(history.Body), f.EventID, `"outcome":"WINNER"`,
		`"tasks_total":1`, "https://example.com/repo") {
		t.Fatalf("the history does not carry the caller's own records: %s", history.Body)
	}

	outsider := s.Session(t, f.Outsider)
	foreign := outsider.Get("/me/history")
	support.RequireStatus(t, foreign, http.StatusOK, "reading the history of a non-participant")
	if strings.Contains(string(foreign.Body), f.EventID) {
		t.Fatalf("the history of one user shows another user's event: %s", foreign.Body)
	}
	if strings.Contains(string(foreign.Body), "https://example.com/repo") {
		t.Fatalf("the history leaked another user's artifact: %s", foreign.Body)
	}
}
