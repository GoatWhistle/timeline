package team

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type TeamService interface {
	ResolveTeamDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Create(ctx context.Context, actor models.Actor, req dto.CreateTeamRequest) (*dto.TeamDetailResponse, error)
	Rename(
		ctx context.Context, actor models.Actor, teamID uuid.UUID, req dto.RenameTeamRequest,
	) (*dto.TeamDetailResponse, error)
	List(ctx context.Context, actor models.Actor) (*dto.TeamListResponse, error)
	Get(ctx context.Context, actor models.Actor, teamID uuid.UUID) (*dto.TeamDetailResponse, error)
	Invite(
		ctx context.Context, actor models.Actor, teamID uuid.UUID, req dto.InviteTeamMemberRequest,
	) (*dto.TeamDetailResponse, error)
	Accept(ctx context.Context, actor models.Actor, teamID uuid.UUID) (*dto.TeamDetailResponse, error)
	Leave(ctx context.Context, actor models.Actor, teamID uuid.UUID) error
	Remove(ctx context.Context, actor models.Actor, teamID, userID uuid.UUID) (*dto.TeamDetailResponse, error)
	EnterEvent(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID, req dto.EnterEventRequest,
	) (*dto.TeamEventEntryResponse, error)
	ChooseTrack(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID, req dto.ChooseTrackRequest,
	) (*dto.TeamEventEntryResponse, error)
	EventStanding(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
	) (*dto.TeamEventEntryResponse, error)
	ListEvents(ctx context.Context, actor models.Actor, teamID uuid.UUID) (*dto.TeamEventEntryListResponse, error)
	AddToRoster(
		ctx context.Context, actor models.Actor, teamID, eventID, userID uuid.UUID,
	) (*dto.TeamEventEntryResponse, error)
	RemoveFromRoster(
		ctx context.Context, actor models.Actor, teamID, eventID, userID uuid.UUID,
	) (*dto.TeamEventEntryResponse, error)
	MarkRosterMemberRegistered(
		ctx context.Context, actor models.Actor, teamID, eventID, userID uuid.UUID,
	) (*dto.TeamEventEntryResponse, error)
	JoinLink(ctx context.Context, actor models.Actor, teamID uuid.UUID) (*dto.TeamJoinLinkResponse, error)
	RotateJoinLink(
		ctx context.Context, actor models.Actor, teamID uuid.UUID,
	) (*dto.TeamJoinLinkSecretResponse, error)
	RevokeJoinLink(ctx context.Context, actor models.Actor, teamID uuid.UUID) error
	JoinByLink(ctx context.Context, actor models.Actor, token string) (*dto.TeamDetailResponse, error)
	ResolveTeamEventLinkDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ListEventLinks(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
	) (*dto.TeamEventLinkListResponse, error)
	AddEventLink(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
		req dto.CreateTeamEventLinkRequest,
	) (*models.TeamEventLink, error)
	UpdateEventLink(
		ctx context.Context, actor models.Actor, linkID uuid.UUID, req dto.UpdateTeamEventLinkRequest,
	) (*models.TeamEventLink, error)
	RemoveEventLink(ctx context.Context, actor models.Actor, linkID uuid.UUID) error
	ReorderEventLinks(
		ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID, ids []uuid.UUID,
	) (*dto.TeamEventLinkListResponse, error)
}
