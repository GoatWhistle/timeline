package personal

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *PersonalService) ListTasks(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.ParticipantTask, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return s.tasks.ListByEvent(ctx, userID, eventID)
}

func (s *PersonalService) CreateTask(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req dto.CreateTaskRequest, stageID *uuid.UUID) (*models.ParticipantTask, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var task *models.ParticipantTask
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
			return err
		}
		title, err := validation.ValidateText("title", req.Title, 1, 200)
		if err != nil {
			return err
		}
		if err := validateNotes(req.Notes, s.limits.MaxNoteLength); err != nil {
			return err
		}
		if err := s.checkStage(ctx, eventID, stageID); err != nil {
			return err
		}

		count, err := s.tasks.CountByEvent(ctx, userID, eventID)
		if err != nil {
			return err
		}
		if count >= s.limits.MaxTasksPerEvent {
			return models.NewConflict("task_limit_reached",
				"the personal task limit for this event is reached")
		}

		sortOrder := 0
		if req.SortOrder != nil {
			sortOrder = *req.SortOrder
		} else if sortOrder, err = s.tasks.NextSortOrder(ctx, userID, eventID); err != nil {
			return err
		}

		task, err = s.tasks.Create(ctx, userID, eventID, req, title, sortOrder)
		return err
	})
	if err != nil {
		return nil, err
	}
	return task, nil
}

func (s *PersonalService) UpdateTask(ctx context.Context, actor models.Actor,
	taskID uuid.UUID, req dto.UpdateTaskRequest, stageID *uuid.UUID) (*models.ParticipantTask, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var task *models.ParticipantTask
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.tasks.GetOwned(ctx, userID, taskID)
		if err != nil {
			return validation.NotFoundOwned(err, "task")
		}
		patch, err := taskPatch(req, stageID, s.limits.MaxNoteLength)
		if err != nil {
			return err
		}
		if patch.StageSet && patch.StageID != nil {
			if err := s.checkStage(ctx, existing.EventID, patch.StageID); err != nil {
				return err
			}
		}
		task, err = s.tasks.Update(ctx, userID, taskID, patch, existing.EventID)
		return validation.NotFoundOwned(err, "task")
	})
	if err != nil {
		return nil, err
	}
	return task, nil
}

func (s *PersonalService) DeleteTask(ctx context.Context, actor models.Actor, taskID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	return validation.NotFoundOwned(s.tasks.Delete(ctx, userID, taskID), "task")
}

func (s *PersonalService) ListTemplates(ctx context.Context,
	actor models.Actor) ([]models.ChecklistTemplate, error) {
	if _, err := s.owner(actor); err != nil {
		return nil, err
	}
	return s.templates.List(ctx)
}

func (s *PersonalService) ApplyTemplate(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req dto.ApplyTemplateRequest) (*dto.BatchResult, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	result := &dto.BatchResult{Results: make([]dto.BatchItemResult, 0, 8)}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		ev, err := s.visibleEvent(ctx, userID, eventID)
		if err != nil {
			return err
		}
		template, err := s.templates.Get(ctx, strings.TrimSpace(req.TemplateID))
		if err != nil {
			return validation.NotFoundOwned(err, "template")
		}
		existing, err := s.tasks.ExistingTitles(ctx, userID, eventID)
		if err != nil {
			return err
		}
		count, err := s.tasks.CountByEvent(ctx, userID, eventID)
		if err != nil {
			return err
		}
		sortOrder, err := s.tasks.NextSortOrder(ctx, userID, eventID)
		if err != nil {
			return err
		}
		return s.applyItems(ctx, userID, ev, template, existing, count, sortOrder, result)
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *PersonalService) applyItems(ctx context.Context, userID uuid.UUID, ev *models.Event,
	template *models.ChecklistTemplate, existing map[string]bool, count, sortOrder int,
	result *dto.BatchResult) error {
	for i, item := range template.Items {
		key := strings.ToLower(strings.TrimSpace(item.TitleKey))
		if existing[key] {
			result.Skipped++
			result.Results = append(result.Results, dto.BatchItemResult{
				Index: i, Key: item.TitleKey, Status: "skipped",
				Code: "already_present", Message: "a task with this title already exists",
			})
			continue
		}
		if count >= s.limits.MaxTasksPerEvent {
			result.Failed++
			result.Results = append(result.Results, dto.BatchItemResult{
				Index: i, Key: item.TitleKey, Status: "error",
				Code: "task_limit_reached", Message: "the personal task limit for this event is reached",
			})
			continue
		}

		req := dto.CreateTaskRequest{Title: item.TitleKey, DueAt: templateDue(ev, item)}
		task, err := s.tasks.Create(ctx, userID, ev.ID, req, item.TitleKey, sortOrder)
		if err != nil {
			return err
		}
		existing[key] = true
		count++
		sortOrder++
		result.Succeeded++
		result.Results = append(result.Results, dto.BatchItemResult{
			Index: i, Key: item.TitleKey, ID: task.DisplayID, Status: "ok",
		})
	}
	return nil
}

func templateDue(ev *models.Event, item models.ChecklistTemplateItem) *time.Time {
	if item.DueOffsetMinutes == nil {
		return nil
	}
	due := ev.StartAt.Add(time.Duration(*item.DueOffsetMinutes) * time.Minute)
	return &due
}

func taskPatch(req dto.UpdateTaskRequest, stageID *uuid.UUID, maxNote int) (dto.TaskPatch, error) {
	var patch dto.TaskPatch
	if req.Title != nil {
		title, err := validation.ValidateText("title", *req.Title, 1, 200)
		if err != nil {
			return patch, err
		}
		patch.Title = &title
	}
	if req.Notes != nil {
		if err := validateNotes(req.Notes, maxNote); err != nil {
			return patch, err
		}
		patch.Notes = req.Notes
		patch.NotesSet = true
	}
	switch {
	case req.ClearDueAt:
		patch.DueAtSet = true
	case req.DueAt != nil:
		patch.DueAt = req.DueAt
		patch.DueAtSet = true
	}
	switch {
	case req.ClearStage:
		patch.StageSet = true
	case stageID != nil:
		patch.StageID = stageID
		patch.StageSet = true
	}
	patch.SortOrder = req.SortOrder
	patch.Done = req.Done
	return patch, nil
}

func validateNotes(notes *string, maxLen int) error {
	if notes == nil || len(*notes) == 0 {
		return nil
	}
	if len([]rune(*notes)) > maxLen {
		return models.NewValidation("the note is too long",
			models.FieldError{Field: "notes", Message: "at most " + validation.Itoa(maxLen) + " characters"})
	}
	return nil
}
