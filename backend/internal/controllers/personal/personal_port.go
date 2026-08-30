package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type PersonalService interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveStageDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveTaskDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveArtifactDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ListTasks(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.ParticipantTask, error)
	CreateTask(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateTaskRequest,
		stageID *uuid.UUID,
	) (*models.ParticipantTask, error)
	UpdateTask(
		ctx context.Context, actor models.Actor, taskID uuid.UUID, req dto.UpdateTaskRequest,
		stageID *uuid.UUID,
	) (*models.ParticipantTask, error)
	DeleteTask(ctx context.Context, actor models.Actor, taskID uuid.UUID) error
	ListTemplates(ctx context.Context, actor models.Actor) ([]models.ChecklistTemplate, error)
	ApplyTemplate(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.ApplyTemplateRequest,
	) (*dto.BatchResult, error)
	GetNote(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.ParticipantNote, error)
	SaveNote(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.SaveNoteRequest,
	) (*models.ParticipantNote, error)
	ListArtifacts(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.ParticipantArtifact, error)
	CreateArtifact(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateArtifactRequest,
	) (*models.ParticipantArtifact, error)
	UpdateArtifact(
		ctx context.Context, actor models.Actor, artifactID uuid.UUID, req dto.UpdateArtifactRequest,
	) (*models.ParticipantArtifact, error)
	DeleteArtifact(ctx context.Context, actor models.Actor, artifactID uuid.UUID) error
	GetOutcome(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.ParticipantOutcome, error)
	SaveOutcome(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.SaveOutcomeRequest,
	) (*models.ParticipantOutcome, error)
	DeleteOutcome(ctx context.Context, actor models.Actor, eventID uuid.UUID) error
	AddBookmark(ctx context.Context, actor models.Actor, eventID uuid.UUID) error
	RemoveBookmark(ctx context.Context, actor models.Actor, eventID uuid.UUID) error
	ListBookmarks(ctx context.Context, actor models.Actor, page models.Page) ([]dto.CatalogEvent, int64, error)
	History(ctx context.Context, actor models.Actor, page models.Page) ([]dto.HistoryItem, int64, error)
	GetRetrospective(
		ctx context.Context, actor models.Actor, eventID uuid.UUID,
	) (*models.ParticipantRetrospective, error)
	SaveRetrospective(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.SaveRetrospectiveRequest,
	) (*models.ParticipantRetrospective, error)
	DeleteRetrospective(ctx context.Context, actor models.Actor, eventID uuid.UUID) error
}
