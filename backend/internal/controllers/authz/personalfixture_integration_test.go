//go:build integration

package authz_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
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
