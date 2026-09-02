//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestTaskRejectsStageOfAnotherEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	stageResp := f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/stages",
		map[string]any{
			"name":     "Foreign demo",
			"type":     "DEMO",
			"start_at": start.Format(time.RFC3339),
			"end_at":   start.Add(time.Hour).Format(time.RFC3339),
		})
	support.RequireStatus(t, stageResp, http.StatusCreated, "creating a stage on the other event")
	var stage struct {
		ID string `json:"id"`
	}
	stageResp.Decode(t, &stage)

	member := s.Session(t, f.Member)
	resp := member.Post("/me/events/"+f.EventID+"/tasks", map[string]any{
		"title":    "Cross event task",
		"stage_id": stage.ID,
	})
	if resp.Status != http.StatusBadRequest && resp.Status != http.StatusNotFound {
		t.Fatalf("a stage of another event was accepted: status %d body %s", resp.Status, resp.Body)
	}

	list := member.Get("/me/events/" + f.EventID + "/tasks")
	if strings.Contains(string(list.Body), "Cross event task") {
		t.Fatalf("the rejected task was stored anyway: %s", list.Body)
	}
}

func TestTaskOnInvisibleEventIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	unpublished := f.AdminClient.CreateEvent(t, "Unpublished event",
		time.Now().UTC().Add(48*time.Hour).Truncate(time.Second))

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Post("/me/events/"+unpublished+"/tasks",
		map[string]any{"title": "Task on an invisible event"}),
		http.StatusNotFound, "creating a task on an unpublished event")
	support.RequireStatus(t, member.Get("/me/events/"+support.MissingEventID+"/tasks"),
		http.StatusNotFound, "listing tasks of a nonexistent event")
}

func TestTaskCompletionIsReversible(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	created := member.Post("/me/events/"+f.EventID+"/tasks",
		map[string]any{"title": "Install the toolchain"})
	support.RequireStatus(t, created, http.StatusCreated, "creating a task")
	var task struct {
		ID     string  `json:"id"`
		DoneAt *string `json:"done_at"`
	}
	created.Decode(t, &task)
	if task.DoneAt != nil {
		t.Fatalf("a fresh task is already marked done: %s", created.Body)
	}

	done := member.Patch("/me/tasks/"+task.ID, map[string]any{"done": true})
	support.RequireStatus(t, done, http.StatusOK, "marking the task done")
	if !strings.Contains(string(done.Body), `"done_at"`) {
		t.Fatalf("marking done did not record the moment: %s", done.Body)
	}

	undone := member.Patch("/me/tasks/"+task.ID, map[string]any{"done": false})
	support.RequireStatus(t, undone, http.StatusOK, "marking the task undone")
	if strings.Contains(string(undone.Body), `"done_at"`) {
		t.Fatalf("marking undone left the completion moment behind: %s", undone.Body)
	}
}

func TestTemplateAppliesOnceWithoutDuplicates(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	templates := member.Get("/me/checklist-templates")
	support.RequireStatus(t, templates, http.StatusOK, "listing checklist templates")
	if !support.ContainsAll(string(templates.Body), "preparation", "build_day", "submission_day") {
		t.Fatalf("the built-in templates are missing: %s", templates.Body)
	}

	first := member.Post("/me/events/"+f.EventID+"/tasks/apply-template",
		map[string]any{"template_id": "preparation"})
	support.RequireStatus(t, first, http.StatusOK, "applying a template")
	if !support.ContainsAll(string(first.Body), `"succeeded":6`, `"skipped":0`) {
		t.Fatalf("the first application did not create every item: %s", first.Body)
	}

	afterFirst := member.Get("/me/events/" + f.EventID + "/tasks")
	var listed struct {
		Items []struct {
			DueAt *time.Time `json:"due_at"`
		} `json:"items"`
	}
	afterFirst.Decode(t, &listed)
	if len(listed.Items) != 6 {
		t.Fatalf("expected 6 tasks after applying the template, got %d", len(listed.Items))
	}
	for _, item := range listed.Items {
		if item.DueAt == nil {
			t.Fatalf("a template task carries no due date: %s", afterFirst.Body)
		}
	}

	second := member.Post("/me/events/"+f.EventID+"/tasks/apply-template",
		map[string]any{"template_id": "preparation"})
	support.RequireStatus(t, second, http.StatusOK, "applying the same template twice")
	if !support.ContainsAll(string(second.Body), `"succeeded":0`, `"skipped":6`) {
		t.Fatalf("re-applying a template duplicated tasks: %s", second.Body)
	}

	afterSecond := member.Get("/me/events/" + f.EventID + "/tasks")
	afterSecond.Decode(t, &listed)
	if len(listed.Items) != 6 {
		t.Fatalf("re-applying the template changed the task count to %d", len(listed.Items))
	}

	support.RequireStatus(t, member.Post("/me/events/"+f.EventID+"/tasks/apply-template",
		map[string]any{"template_id": "no-such-template"}),
		http.StatusNotFound, "applying an unknown template")
}

func TestTaskAcceptsStageOfItsOwnEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	stageResp := f.AdminClient.Post("/admin/events/"+f.EventID+"/stages",
		map[string]any{
			"name":     "Own demo",
			"type":     "DEMO",
			"start_at": start.Format(time.RFC3339),
			"end_at":   start.Add(time.Hour).Format(time.RFC3339),
		})
	support.RequireStatus(t, stageResp, http.StatusCreated, "creating a stage on the own event")
	var stage struct {
		ID string `json:"id"`
	}
	stageResp.Decode(t, &stage)

	member := s.Session(t, f.Member)
	created := member.Post("/me/events/"+f.EventID+"/tasks", map[string]any{
		"title":    "Task pinned to a stage",
		"stage_id": stage.ID,
	})
	support.RequireStatus(t, created, http.StatusCreated,
		"pinning a personal task to a stage of its own event")

	var task struct {
		ID      string  `json:"id"`
		StageID *string `json:"stage_id"`
	}
	created.Decode(t, &task)
	if task.StageID == nil || *task.StageID != stage.ID {
		t.Fatalf("the created task does not carry the stage it was pinned to: %s", created.Body)
	}

	list := member.Get("/me/events/" + f.EventID + "/tasks")
	support.RequireStatus(t, list, http.StatusOK, "listing the own tasks")
	if !strings.Contains(string(list.Body), stage.ID) {
		t.Fatalf("the stage is missing from the stored task: %s", list.Body)
	}
}
