//go:build integration

package apitest_test

import (
	"github.com/google/uuid"
	"net/http"
	"strings"
	"testing"
)

const (
	personalTaskTitle = "Record the demo video"
	personalNoteBody  = "private draft nobody else may read"
)

type personalRecords struct {
	taskID     uuid.UUID
	artifactID uuid.UUID
}

func (c *client) put(path string, body any) response {
	return c.mutate(http.MethodPut, path, body)
}

func (c *client) seedPersonal(t *testing.T, eventID uuid.UUID) personalRecords {
	t.Helper()

	taskResp := c.post("/me/events/"+eventID.String()+"/tasks",
		map[string]any{"title": personalTaskTitle})
	requireStatus(t, taskResp, http.StatusCreated, "creating a personal task")
	var task struct {
		ID uuid.UUID `json:"id"`
	}
	taskResp.decode(t, &task)

	requireStatus(t, c.put("/me/events/"+eventID.String()+"/note",
		map[string]any{"body": personalNoteBody}), http.StatusOK, "saving a personal note")

	artifactResp := c.post("/me/events/"+eventID.String()+"/artifacts",
		map[string]any{"kind": "REPOSITORY", "url": "https://example.com/repo"})
	requireStatus(t, artifactResp, http.StatusCreated, "creating an artifact")
	var artifact struct {
		ID uuid.UUID `json:"id"`
	}
	artifactResp.decode(t, &artifact)

	requireStatus(t, c.put("/me/events/"+eventID.String()+"/outcome",
		map[string]any{"outcome": "WINNER", "place": 1}), http.StatusOK, "recording an outcome")

	requireStatus(t, c.put("/me/bookmarks/"+eventID.String(), nil),
		http.StatusNoContent, "bookmarking the event")

	return personalRecords{taskID: task.ID, artifactID: artifact.ID}
}

func (c *client) assign(t *testing.T, eventID, userID uuid.UUID) {
	t.Helper()
	resp := c.post("/admin/events/"+eventID.String()+"/participants/batch-add",
		map[string]any{"items": []map[string]any{
			{"user_id": userID.String(), "team_role": "Developer"},
		}})
	requireStatus(t, resp, http.StatusOK, "assigning a participant")
	if !containsAll(string(resp.Body), `"succeeded":1`) {
		t.Fatalf("assigning a participant did not succeed: %s", resp.Body)
	}
}

func TestEmptyNoteDeletesTheRecord(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	blank := member.get("/me/events/" + f.eventID.String() + "/note")
	requireStatus(t, blank, http.StatusOK, "reading a note that was never written")
	if !containsAll(string(blank.Body), `"body":""`) {
		t.Fatalf("a missing note is not answered with an empty body: %s", blank.Body)
	}

	markdown := "# Plan\n\n- [ ] talk to the mentor"
	saved := member.put("/me/events/"+f.eventID.String()+"/note",
		map[string]any{"body": markdown})
	requireStatus(t, saved, http.StatusOK, "saving a note")

	read := member.get("/me/events/" + f.eventID.String() + "/note")
	var note struct {
		Body string `json:"body"`
	}
	read.decode(t, &note)
	if note.Body != markdown {
		t.Fatalf("the server did not return the Markdown source verbatim: %q", note.Body)
	}

	requireStatus(t, member.put("/me/events/"+f.eventID.String()+"/note",
		map[string]any{"body": "   "}), http.StatusOK, "saving a blank note")

	after := member.get("/me/events/" + f.eventID.String() + "/note")
	after.decode(t, &note)
	if note.Body != "" {
		t.Fatalf("a blank save left the note behind: %q", note.Body)
	}
	if s.countRows(t, "participant_notes") != 0 {
		t.Fatalf("a blank save kept an empty row in participant_notes")
	}
}

func TestOutcomeDefaultsToParticipatedAndGuardsPlace(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	plain := member.put("/me/events/"+f.eventID.String()+"/outcome", map[string]any{})
	requireStatus(t, plain, http.StatusOK, "recording an outcome without a value")
	if !containsAll(string(plain.Body), `"outcome":"PARTICIPATED"`) {
		t.Fatalf("the default outcome is not PARTICIPATED: %s", plain.Body)
	}
	if strings.Contains(string(plain.Body), `"place"`) {
		t.Fatalf("a default outcome carries a place: %s", plain.Body)
	}

	bad := member.put("/me/events/"+f.eventID.String()+"/outcome",
		map[string]any{"outcome": "PARTICIPATED", "place": 1})
	requireStatus(t, bad, http.StatusBadRequest, "a place alongside PARTICIPATED")

	good := member.put("/me/events/"+f.eventID.String()+"/outcome",
		map[string]any{"outcome": "WINNER", "place": 1, "track": "Smart city"})
	requireStatus(t, good, http.StatusOK, "a place alongside WINNER")
	if !containsAll(string(good.Body), `"outcome":"WINNER"`, `"place":1`) {
		t.Fatalf("the placing outcome was not stored: %s", good.Body)
	}
}

func TestBookmarkIsNotParticipation(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	outsider := s.session(t, f.outsider)
	participantsBefore := s.countRows(t, "event_participants")
	statusesBefore := s.countRows(t, "registration_statuses")
	notifyBefore := s.countRows(t, "notifications")

	requireStatus(t, outsider.put("/me/bookmarks/"+f.eventID.String(), nil),
		http.StatusNoContent, "bookmarking an event the caller has not joined")
	requireStatus(t, outsider.put("/me/bookmarks/"+f.eventID.String(), nil),
		http.StatusNoContent, "bookmarking the same event again")

	if after := s.countRows(t, "event_participants"); after != participantsBefore {
		t.Fatalf("bookmarking created a participant assignment")
	}
	if after := s.countRows(t, "registration_statuses"); after != statusesBefore {
		t.Fatalf("bookmarking created a registration status")
	}
	if after := s.countRows(t, "notifications"); after != notifyBefore {
		t.Fatalf("bookmarking queued a notification")
	}
	if total := s.countRows(t, "event_bookmarks"); total != 1 {
		t.Fatalf("bookmarking twice produced %d rows, expected 1", total)
	}

	list := outsider.get("/me/bookmarks")
	requireStatus(t, list, http.StatusOK, "listing bookmarks")
	if !containsAll(string(list.Body), f.eventID.String(), `"joined":false`) {
		t.Fatalf("the bookmark listing does not show the event as not joined: %s", list.Body)
	}

	requireStatus(t, outsider.delete("/me/bookmarks/"+f.eventID.String()),
		http.StatusNoContent, "removing the bookmark")
	requireStatus(t, outsider.delete("/me/bookmarks/"+f.eventID.String()),
		http.StatusNotFound, "removing a bookmark that is already gone")
}

func TestHistoryShowsOnlyOwnRecords(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	member.seedPersonal(t, f.eventID)

	history := member.get("/me/history")
	requireStatus(t, history, http.StatusOK, "reading own history")
	if !containsAll(string(history.Body), f.eventID.String(), `"outcome":"WINNER"`,
		`"tasks_total":1`, "https://example.com/repo") {
		t.Fatalf("the history does not carry the caller's own records: %s", history.Body)
	}

	outsider := s.session(t, f.outsider)
	foreign := outsider.get("/me/history")
	requireStatus(t, foreign, http.StatusOK, "reading the history of a non-participant")
	if strings.Contains(string(foreign.Body), f.eventID.String()) {
		t.Fatalf("the history of one user shows another user's event: %s", foreign.Body)
	}
	if strings.Contains(string(foreign.Body), "https://example.com/repo") {
		t.Fatalf("the history leaked another user's artifact: %s", foreign.Body)
	}
}
