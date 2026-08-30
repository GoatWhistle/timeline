//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestPersonalRecordsAreInvisibleToAnotherParticipant(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	owner := s.session(t, f.member)
	records := owner.seedPersonal(t, f.eventID)

	other := s.register(t, "second-"+uuid.NewString()+"@example.com")
	f.adminClient.assign(t, f.eventID, other.ID)
	intruder := s.session(t, other)

	tasks := intruder.get("/me/events/" + f.eventID.String() + "/tasks")
	requireStatus(t, tasks, http.StatusOK, "another participant lists tasks")
	if strings.Contains(string(tasks.Body), records.taskID.String()) {
		t.Fatalf("the task of another user leaked into the listing: %s", tasks.Body)
	}
	if !containsAll(string(tasks.Body), `"items":[]`) {
		t.Fatalf("another participant sees a non-empty task list: %s", tasks.Body)
	}

	note := intruder.get("/me/events/" + f.eventID.String() + "/note")
	requireStatus(t, note, http.StatusOK, "another participant reads the note")
	if strings.Contains(string(note.Body), personalNoteBody) {
		t.Fatalf("the private note of another user leaked: %s", note.Body)
	}

	artifacts := intruder.get("/me/events/" + f.eventID.String() + "/artifacts")
	requireStatus(t, artifacts, http.StatusOK, "another participant lists artifacts")
	if strings.Contains(string(artifacts.Body), records.artifactID.String()) {
		t.Fatalf("the artifact of another user leaked: %s", artifacts.Body)
	}

	outcome := intruder.get("/me/events/" + f.eventID.String() + "/outcome")
	requireStatus(t, outcome, http.StatusNotFound, "another participant reads the outcome")

	bookmarks := intruder.get("/me/bookmarks")
	requireStatus(t, bookmarks, http.StatusOK, "another participant lists bookmarks")
	if strings.Contains(string(bookmarks.Body), f.eventID.String()) {
		t.Fatalf("the bookmark of another user leaked: %s", bookmarks.Body)
	}
}

func TestForeignPersonalRecordAnswersNotFoundNotForbidden(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	owner := s.session(t, f.member)
	records := owner.seedPersonal(t, f.eventID)

	other := s.register(t, "second-"+uuid.NewString()+"@example.com")
	f.adminClient.assign(t, f.eventID, other.ID)
	intruder := s.session(t, other)

	foreignTask := intruder.patch("/me/tasks/"+records.taskID.String(),
		map[string]any{"title": "Taken over"})
	missingTask := intruder.patch("/me/tasks/"+uuid.NewString(),
		map[string]any{"title": "Taken over"})
	requireStatus(t, foreignTask, http.StatusNotFound, "patching a foreign task")
	requireStatus(t, missingTask, http.StatusNotFound, "patching a missing task")
	if foreignTask.errorCode(t) != missingTask.errorCode(t) {
		t.Fatalf("a foreign task is distinguishable from a missing one: %s versus %s",
			foreignTask.Body, missingTask.Body)
	}

	requireStatus(t, intruder.delete("/me/tasks/"+records.taskID.String()),
		http.StatusNotFound, "deleting a foreign task")
	requireStatus(t, intruder.delete("/me/artifacts/"+records.artifactID.String()),
		http.StatusNotFound, "deleting a foreign artifact")

	stillThere := owner.get("/me/events/" + f.eventID.String() + "/tasks")
	if !strings.Contains(string(stillThere.Body), records.taskID.String()) {
		t.Fatalf("the owner lost their task to a foreign request: %s", stillThere.Body)
	}
}

func TestAdministratorHasNoPrivilegeInThePersonalLayer(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	owner := s.session(t, f.member)
	records := owner.seedPersonal(t, f.eventID)

	tasks := f.adminClient.get("/me/events/" + f.eventID.String() + "/tasks")
	requireStatus(t, tasks, http.StatusOK, "the administrator lists tasks of an event")
	if strings.Contains(string(tasks.Body), records.taskID.String()) {
		t.Fatalf("the administrator sees a participant task: %s", tasks.Body)
	}

	note := f.adminClient.get("/me/events/" + f.eventID.String() + "/note")
	if strings.Contains(string(note.Body), personalNoteBody) {
		t.Fatalf("the administrator sees a private note: %s", note.Body)
	}

	requireStatus(t, f.adminClient.patch("/me/tasks/"+records.taskID.String(),
		map[string]any{"done": true}), http.StatusNotFound,
		"the administrator patches a participant task")
	requireStatus(t, f.adminClient.delete("/me/tasks/"+records.taskID.String()),
		http.StatusNotFound, "the administrator deletes a participant task")
	requireStatus(t, f.adminClient.get("/me/events/"+f.eventID.String()+"/outcome"),
		http.StatusNotFound, "the administrator reads a participant outcome")
}

func TestPersonalRecordsReachNeitherAuditLogNorNotifications(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	auditBefore := s.countRows(t, "audit_log")
	notifyBefore := s.countRows(t, "notifications")

	owner := s.session(t, f.member)
	records := owner.seedPersonal(t, f.eventID)

	requireStatus(t, owner.patch("/me/tasks/"+records.taskID.String(),
		map[string]any{"done": true}), http.StatusOK, "marking the task done")
	requireStatus(t, owner.patch("/me/tasks/"+records.taskID.String(),
		map[string]any{"done": false}), http.StatusOK, "marking the task undone")
	requireStatus(t, owner.delete("/me/tasks/"+records.taskID.String()),
		http.StatusNoContent, "deleting the task")
	requireStatus(t, owner.put("/me/events/"+f.eventID.String()+"/note",
		map[string]any{"body": ""}), http.StatusOK, "clearing the note")
	requireStatus(t, owner.delete("/me/artifacts/"+records.artifactID.String()),
		http.StatusNoContent, "deleting the artifact")
	requireStatus(t, owner.delete("/me/events/"+f.eventID.String()+"/outcome"),
		http.StatusNoContent, "deleting the outcome")
	requireStatus(t, owner.delete("/me/bookmarks/"+f.eventID.String()),
		http.StatusNoContent, "removing the bookmark")

	if after := s.countRows(t, "audit_log"); after != auditBefore {
		t.Fatalf("the personal layer wrote %d audit rows, specification 5.4 forbids any",
			after-auditBefore)
	}
	if after := s.countRows(t, "notifications"); after != notifyBefore {
		t.Fatalf("the personal layer queued %d notifications, specification 5.4 forbids any",
			after-notifyBefore)
	}
	if s.auditMentions(t, personalNoteBody) {
		t.Fatalf("the text of a private note reached the audit log")
	}
	if s.auditMentions(t, personalTaskTitle) {
		t.Fatalf("the title of a personal task reached the audit log")
	}
}

func (s *stack) countRows(t *testing.T, table string) int64 {
	t.Helper()
	var total int64
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM `+table).Scan(&total); err != nil {
		t.Fatalf("counting %s: %v", table, err)
	}
	return total
}

func (s *stack) auditMentions(t *testing.T, needle string) bool {
	t.Helper()
	var total int64
	err := s.db.Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM audit_log
		WHERE coalesce(before_json::text, '') LIKE '%' || $1 || '%'
		   OR coalesce(after_json::text, '') LIKE '%' || $1 || '%'`, needle).Scan(&total)
	if err != nil {
		t.Fatalf("searching the audit log: %v", err)
	}
	return total > 0
}
