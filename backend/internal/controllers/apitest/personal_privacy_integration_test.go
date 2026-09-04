//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestPersonalRecordsAreInvisibleToAnotherParticipant(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	owner := s.Session(t, f.Member)
	records := seedPersonal(owner, t, f.EventID)

	other := s.Register(t, "second-"+uuid.NewString()+"@example.com")
	assign(f.AdminClient, t, f.EventID, other.ID)
	intruder := s.Session(t, other)

	tasks := intruder.Get("/me/events/" + f.EventID + "/tasks")
	support.RequireStatus(t, tasks, http.StatusOK, "another participant lists tasks")
	if strings.Contains(string(tasks.Body), records.taskID) {
		t.Fatalf("the task of another user leaked into the listing: %s", tasks.Body)
	}
	if !support.ContainsAll(string(tasks.Body), `"items":[]`) {
		t.Fatalf("another participant sees a non-empty task list: %s", tasks.Body)
	}

	note := intruder.Get("/me/events/" + f.EventID + "/note")
	support.RequireStatus(t, note, http.StatusOK, "another participant reads the note")
	if strings.Contains(string(note.Body), personalNoteBody) {
		t.Fatalf("the private note of another user leaked: %s", note.Body)
	}

	artifacts := intruder.Get("/me/events/" + f.EventID + "/artifacts")
	support.RequireStatus(t, artifacts, http.StatusOK, "another participant lists artifacts")
	if strings.Contains(string(artifacts.Body), records.artifactID) {
		t.Fatalf("the artifact of another user leaked: %s", artifacts.Body)
	}

	outcome := intruder.Get("/me/events/" + f.EventID + "/outcome")
	support.RequireStatus(t, outcome, http.StatusNotFound, "another participant reads the outcome")
}

func TestForeignPersonalRecordAnswersNotFoundNotForbidden(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	owner := s.Session(t, f.Member)
	records := seedPersonal(owner, t, f.EventID)

	other := s.Register(t, "second-"+uuid.NewString()+"@example.com")
	assign(f.AdminClient, t, f.EventID, other.ID)
	intruder := s.Session(t, other)

	foreignTask := intruder.Patch("/me/tasks/"+records.taskID,
		map[string]any{"title": "Taken over"})
	missingTask := intruder.Patch("/me/tasks/"+support.MissingTaskID,
		map[string]any{"title": "Taken over"})
	support.RequireStatus(t, foreignTask, http.StatusNotFound, "patching a foreign task")
	support.RequireStatus(t, missingTask, http.StatusNotFound, "patching a missing task")
	if foreignTask.ErrorCode(t) != missingTask.ErrorCode(t) {
		t.Fatalf("a foreign task is distinguishable from a missing one: %s versus %s",
			foreignTask.Body, missingTask.Body)
	}

	support.RequireStatus(t, intruder.Delete("/me/tasks/"+records.taskID),
		http.StatusNotFound, "deleting a foreign task")
	support.RequireStatus(t, intruder.Delete("/me/artifacts/"+records.artifactID),
		http.StatusNotFound, "deleting a foreign artifact")

	stillThere := owner.Get("/me/events/" + f.EventID + "/tasks")
	if !strings.Contains(string(stillThere.Body), records.taskID) {
		t.Fatalf("the owner lost their task to a foreign request: %s", stillThere.Body)
	}
}

func TestAdministratorHasNoPrivilegeInThePersonalLayer(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	owner := s.Session(t, f.Member)
	records := seedPersonal(owner, t, f.EventID)

	tasks := f.AdminClient.Get("/me/events/" + f.EventID + "/tasks")
	support.RequireStatus(t, tasks, http.StatusOK, "the administrator lists tasks of an event")
	if strings.Contains(string(tasks.Body), records.taskID) {
		t.Fatalf("the administrator sees a participant task: %s", tasks.Body)
	}

	note := f.AdminClient.Get("/me/events/" + f.EventID + "/note")
	if strings.Contains(string(note.Body), personalNoteBody) {
		t.Fatalf("the administrator sees a private note: %s", note.Body)
	}

	support.RequireStatus(t, f.AdminClient.Patch("/me/tasks/"+records.taskID,
		map[string]any{"done": true}), http.StatusNotFound,
		"the administrator patches a participant task")
	support.RequireStatus(t, f.AdminClient.Delete("/me/tasks/"+records.taskID),
		http.StatusNotFound, "the administrator deletes a participant task")
	support.RequireStatus(t, f.AdminClient.Get("/me/events/"+f.EventID+"/outcome"),
		http.StatusNotFound, "the administrator reads a participant outcome")
}

func TestPersonalRecordsReachNeitherAuditLogNorNotifications(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	auditBefore := countRows(s, t, "audit_log")
	notifyBefore := countRows(s, t, "notifications")

	owner := s.Session(t, f.Member)
	records := seedPersonal(owner, t, f.EventID)

	support.RequireStatus(t, owner.Patch("/me/tasks/"+records.taskID,
		map[string]any{"done": true}), http.StatusOK, "marking the task done")
	support.RequireStatus(t, owner.Patch("/me/tasks/"+records.taskID,
		map[string]any{"done": false}), http.StatusOK, "marking the task undone")
	support.RequireStatus(t, owner.Delete("/me/tasks/"+records.taskID),
		http.StatusNoContent, "deleting the task")
	support.RequireStatus(t, put(owner, "/me/events/"+f.EventID+"/note",
		map[string]any{"body": ""}), http.StatusOK, "clearing the note")
	support.RequireStatus(t, owner.Delete("/me/artifacts/"+records.artifactID),
		http.StatusNoContent, "deleting the artifact")
	support.RequireStatus(t, owner.Delete("/me/events/"+f.EventID+"/outcome"),
		http.StatusNoContent, "deleting the outcome")

	if after := countRows(s, t, "audit_log"); after != auditBefore {
		t.Fatalf("the personal layer wrote %d audit rows, specification 5.4 forbids any",
			after-auditBefore)
	}
	if after := countRows(s, t, "notifications"); after != notifyBefore {
		t.Fatalf("the personal layer queued %d notifications, specification 5.4 forbids any",
			after-notifyBefore)
	}
	if auditMentions(s, t, personalNoteBody) {
		t.Fatalf("the text of a private note reached the audit log")
	}
	if auditMentions(s, t, personalTaskTitle) {
		t.Fatalf("the title of a personal task reached the audit log")
	}
}

func countRows(s *support.Stack, t *testing.T, table string) int64 {
	t.Helper()
	var total int64
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM `+table).Scan(&total); err != nil {
		t.Fatalf("counting %s: %v", table, err)
	}
	return total
}

func auditMentions(s *support.Stack, t *testing.T, needle string) bool {
	t.Helper()
	var total int64
	err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM audit_log
		WHERE coalesce(before_json::text, '') LIKE '%' || $1 || '%'
		   OR coalesce(after_json::text, '') LIKE '%' || $1 || '%'`, needle).Scan(&total)
	if err != nil {
		t.Fatalf("searching the audit log: %v", err)
	}
	return total > 0
}

func TestPublicProfileShowsOnlyEventsTheOwnerAllowed(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "consent", "profile_public": true,
	}), http.StatusOK, "opening the profile")

	silent := s.Anonymous(t, "/profiles/consent")
	support.RequireStatus(t, silent, http.StatusOK, "reading a profile that allowed nothing")
	if strings.Contains(string(silent.Body), f.EventID) {
		t.Fatalf("an event nobody allowed on the profile is published anyway: %s", silent.Body)
	}
	if !support.ContainsAll(string(silent.Body), `"events":[]`) {
		t.Fatalf("the profile lists events without the owner's consent: %s", silent.Body)
	}

	s.ShowOnProfile(t, f.Member.ID)
	allowed := s.Anonymous(t, "/profiles/consent")
	support.RequireStatus(t, allowed, http.StatusOK, "reading a profile after the owner allowed the event")
	if !support.ContainsAll(string(allowed.Body), f.EventID) {
		t.Fatalf("an allowed event is still hidden: %s", allowed.Body)
	}
}

func TestPublicProfileHidesUnpublishedAndArchivedEvents(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "lifecycle", "profile_public": true,
	}), http.StatusOK, "opening the profile")
	s.ShowOnProfile(t, f.Member.ID)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/archive", nil),
		http.StatusOK, "archiving the event")

	page := s.Anonymous(t, "/profiles/lifecycle")
	support.RequireStatus(t, page, http.StatusOK, "reading the profile after the event was archived")
	if strings.Contains(string(page.Body), f.EventID) {
		t.Fatalf("an archived event stays on the public profile: %s", page.Body)
	}
}
