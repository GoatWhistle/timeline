package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type ParticipantService interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, filter models.ParticipantFilter, page models.Page,
	) ([]models.ParticipantResponse, int64, error)
	AddMany(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.AddParticipantsRequest,
	) (*models.BatchResult, error)
	RemoveMany(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.RemoveParticipantsRequest,
	) (*models.BatchResult, error)
	UpdateTeamRole(
		ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string,
	) (*models.ParticipantResponse, error)
	Reactivate(
		ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string,
	) (*models.ParticipantResponse, error)
	CopyFrom(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CopyParticipantsRequest,
	) (*models.BatchResult, error)
}
