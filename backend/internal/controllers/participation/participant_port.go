package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type ParticipantService interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveParticipantDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, filter models.ParticipantFilter, page models.Page,
	) ([]dto.ParticipantResponse, int64, error)
	AddMany(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.AddParticipantsRequest,
		userIDs dto.ResolvedIDs,
	) (*dto.BatchResult, error)
	RemoveMany(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.RemoveParticipantsRequest,
		participantIDs dto.ResolvedIDs,
	) (*dto.BatchResult, error)
	UpdateTeamRole(
		ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string,
	) (*dto.ParticipantResponse, error)
	Reactivate(
		ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string,
	) (*dto.ParticipantResponse, error)
	CopyFrom(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CopyParticipantsRequest,
		sourceEventID uuid.UUID, overrideUserIDs dto.ResolvedIDs,
	) (*dto.BatchResult, error)
}
