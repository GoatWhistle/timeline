package team

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/team"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

const teamNameMaxLen = 120

type TeamService struct {
	db            *postgres.DB
	teams         *team.Teams
	members       *team.Members
	entries       *team.Entries
	rosters       *team.Rosters
	links         *team.JoinLinks
	eventLinks    *team.EventLinks
	events        *event.Events
	tracks        *event.Tracks
	participants  *participation.Participants
	registrations *participation.Registrations
	statuses      *participation.Statuses
	users         *identity.Users
	notifier      Notifier
	audit         *audit.AuditService
	publicURL     string
	joinLinkTTL   time.Duration
	now           func() time.Time
}

func NewTeamService(db *postgres.DB, teams *team.Teams, members *team.Members,
	entries *team.Entries, rosters *team.Rosters, links *team.JoinLinks,
	eventLinks *team.EventLinks,
	events *event.Events, tracks *event.Tracks, participants *participation.Participants,
	registrations *participation.Registrations, statuses *participation.Statuses,
	users *identity.Users, notifier Notifier, audit *audit.AuditService,
	cfg *config.Config) *TeamService {
	return &TeamService{
		db: db, teams: teams, members: members, entries: entries, rosters: rosters, links: links,
		eventLinks: eventLinks, events: events, tracks: tracks, participants: participants,
		registrations: registrations, statuses: statuses,
		users: users, notifier: notifier, audit: audit,
		publicURL: cfg.App.PublicURL, joinLinkTTL: cfg.Auth.TeamJoinLinkTTL,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *TeamService) Create(ctx context.Context, actor models.Actor, req dto.CreateTeamRequest,
) (*dto.TeamDetailResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	name, err := validation.ValidateText("name", req.Name, 1, teamNameMaxLen)
	if err != nil {
		return nil, err
	}

	var created *models.Team
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot lead a team")
		}
		created, err = s.teams.Create(ctx, name, actor.UserID)
		if err != nil {
			return err
		}
		if _, err := s.members.AddLead(ctx, created.ID, actor.UserID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamCreate, models.EntityTeam, created.ID, nil,
			map[string]any{"name": created.Name, "lead_user_id": actor.UserID})
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, created)
}

func (s *TeamService) Rename(ctx context.Context, actor models.Actor, teamID uuid.UUID,
	req dto.RenameTeamRequest) (*dto.TeamDetailResponse, error) {
	name, err := validation.ValidateText("name", req.Name, 1, teamNameMaxLen)
	if err != nil {
		return nil, err
	}

	var renamed *models.Team
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.leadOnly(ctx, actor, teamID)
		if err != nil {
			return err
		}
		renamed, err = s.teams.Rename(ctx, teamID, name)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamRename, models.EntityTeam, teamID,
			map[string]any{"name": existing.Name}, map[string]any{"name": renamed.Name})
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, renamed)
}

func (s *TeamService) List(ctx context.Context, actor models.Actor) (*dto.TeamListResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	rows, err := s.teams.SummariesForUser(ctx, actor.UserID)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TeamResponse, 0, len(rows))
	for index := range rows {
		items = append(items, dto.TeamResponse{
			ID:        rows[index].Team.DisplayID,
			Name:      rows[index].Team.Name,
			Lead:      rows[index].Lead,
			IsLead:    rows[index].Team.LedBy(actor.UserID),
			MyState:   rows[index].MyState,
			CreatedAt: rows[index].Team.CreatedAt,
			UpdatedAt: rows[index].Team.UpdatedAt,
		})
	}
	return &dto.TeamListResponse{Items: items}, nil
}

func (s *TeamService) Get(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*dto.TeamDetailResponse, error) {
	existing, err := s.visible(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, existing)
}

func (s *TeamService) summary(ctx context.Context, actor models.Actor, existing *models.Team,
) (dto.TeamResponse, error) {
	lead, err := s.users.GetByID(ctx, existing.LeadUserID)
	if err != nil {
		return dto.TeamResponse{}, err
	}
	item := dto.TeamResponse{
		ID:        existing.DisplayID,
		Name:      existing.Name,
		Lead:      userSummary(lead),
		IsLead:    existing.LedBy(actor.UserID),
		CreatedAt: existing.CreatedAt,
		UpdatedAt: existing.UpdatedAt,
	}
	membership, err := s.members.GetByTeamUser(ctx, existing.ID, actor.UserID)
	switch {
	case err == nil:
		item.MyState = string(membership.State)
	case errors.Is(err, models.ErrNotFound):
	default:
		return dto.TeamResponse{}, err
	}
	return item, nil
}

func (s *TeamService) detail(ctx context.Context, actor models.Actor, existing *models.Team,
) (*dto.TeamDetailResponse, error) {
	summary, err := s.summary(ctx, actor, existing)
	if err != nil {
		return nil, err
	}
	members, err := s.members.List(ctx, existing.ID)
	if err != nil {
		return nil, err
	}
	return &dto.TeamDetailResponse{Team: summary, Members: members}, nil
}

func userSummary(user *models.User) dto.UserSummary {
	summary := dto.UserSummary{
		ID: user.DisplayID, FirstName: user.FirstName, MiddleName: user.MiddleName,
		LastName: user.LastName, Nickname: user.Nickname,
		Email: user.Email, IsActive: user.IsActive,
	}
	summary.Fill(user.Locale)
	return summary
}
