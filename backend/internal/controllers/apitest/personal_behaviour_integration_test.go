//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestTaskRejectsStageOfAnotherEvent(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	stageResp := f.adminClient.post("/admin/events/"+f.otherEvent.String()+"/stages",
		map[string]any{
			"name":     "Foreign demo",
			"type":     "DEMO",
			"start_at": start.Format(time.RFC3339),
			"end_at":   start.Add(time.Hour).Format(time.RFC3339),
		})
	requireStatus(t, stageResp, http.StatusCreated, "creating a stage on the other event")
	var stage struct {
		ID uuid.UUID `json:"id"`
	}
	stageResp.decode(t, &stage)

	member := s.session(t, f.member)
	resp := member.post("/me/events/"+f.eventID.String()+"/tasks", map[string]any{
		"title":    "Cross event task",
		"stage_id": stage.ID.String(),
	})
	if resp.Status != http.StatusBadRequest && resp.Status != http.StatusNotFound {
		t.Fatalf("a stage of another event was accepted: status %d body %s", resp.Status, resp.Body)
	}

	list := member.get("/me/events/" + f.eventID.String() + "/tasks")
	if strings.Contains(string(list.Body), "Cross event task") {
		t.Fatalf("the rejected task was stored anyway: %s", list.Body)
	}
}

func TestTaskOnInvisibleEventIsNotFound(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	unpublished := f.adminClient.createEvent(t, "Unpublished event",
		time.Now().UTC().Add(48*time.Hour).Truncate(time.Second))

	member := s.session(t, f.member)
	requireStatus(t, member.post("/me/events/"+unpublished.String()+"/tasks",
		map[string]any{"title": "Task on an invisible event"}),
		http.StatusNotFound, "creating a task on an unpublished event")
	requireStatus(t, member.get("/me/events/"+uuid.NewString()+"/tasks"),
		http.StatusNotFound, "listing tasks of a nonexistent event")
}

func TestTaskCompletionIsReversible(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	created := member.post("/me/events/"+f.eventID.String()+"/tasks",
		map[string]any{"title": "Install the toolchain"})
	requireStatus(t, created, http.StatusCreated, "creating a task")
	var task struct {
		ID     uuid.UUID `json:"id"`
		DoneAt *string   `json:"done_at"`
	}
	created.decode(t, &task)
	if task.DoneAt != nil {
		t.Fatalf("a fresh task is already marked done: %s", created.Body)
	}

	done := member.patch("/me/tasks/"+task.ID.String(), map[string]any{"done": true})
	requireStatus(t, done, http.StatusOK, "marking the task done")
	if !strings.Contains(string(done.Body), `"done_at"`) {
		t.Fatalf("marking done did not record the moment: %s", done.Body)
	}

	undone := member.patch("/me/tasks/"+task.ID.String(), map[string]any{"done": false})
	requireStatus(t, undone, http.StatusOK, "marking the task undone")
	if strings.Contains(string(undone.Body), `"done_at"`) {
		t.Fatalf("marking undone left the completion moment behind: %s", undone.Body)
	}
}

func TestTemplateAppliesOnceWithoutDuplicates(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	templates := member.get("/me/checklist-templates")
	requireStatus(t, templates, http.StatusOK, "listing checklist templates")
	if !containsAll(string(templates.Body), "preparation", "build_day", "submission_day") {
		t.Fatalf("the built-in templates are missing: %s", templates.Body)
	}

	first := member.post("/me/events/"+f.eventID.String()+"/tasks/apply-template",
		map[string]any{"template_id": "preparation"})
	requireStatus(t, first, http.StatusOK, "applying a template")
	if !containsAll(string(first.Body), `"succeeded":6`, `"skipped":0`) {
		t.Fatalf("the first application did not create every item: %s", first.Body)
	}

	afterFirst := member.get("/me/events/" + f.eventID.String() + "/tasks")
	var listed struct {
		Items []struct {
			DueAt *time.Time `json:"due_at"`
		} `json:"items"`
	}
	afterFirst.decode(t, &listed)
	if len(listed.Items) != 6 {
		t.Fatalf("expected 6 tasks after applying the template, got %d", len(listed.Items))
	}
	for _, item := range listed.Items {
		if item.DueAt == nil {
			t.Fatalf("a template task carries no due date: %s", afterFirst.Body)
		}
	}

	second := member.post("/me/events/"+f.eventID.String()+"/tasks/apply-template",
		map[string]any{"template_id": "preparation"})
	requireStatus(t, second, http.StatusOK, "applying the same template twice")
	if !containsAll(string(second.Body), `"succeeded":0`, `"skipped":6`) {
		t.Fatalf("re-applying a template duplicated tasks: %s", second.Body)
	}

	afterSecond := member.get("/me/events/" + f.eventID.String() + "/tasks")
	afterSecond.decode(t, &listed)
	if len(listed.Items) != 6 {
		t.Fatalf("re-applying the template changed the task count to %d", len(listed.Items))
	}

	requireStatus(t, member.post("/me/events/"+f.eventID.String()+"/tasks/apply-template",
		map[string]any{"template_id": "no-such-template"}),
		http.StatusNotFound, "applying an unknown template")
}
