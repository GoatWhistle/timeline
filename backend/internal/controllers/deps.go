package controllers

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type AuthService interface {
	Register(ctx context.Context, req models.RegisterRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Login(ctx context.Context, req models.LoginRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	LogoutAll(ctx context.Context, actor models.Actor) error
	ListSessions(ctx context.Context, actor models.Actor) ([]models.SessionResponse, error)
	RevokeSession(ctx context.Context, actor models.Actor, sessionID uuid.UUID) (bool, error)
	VerifyEmail(ctx context.Context, token string) error
	ResendVerification(ctx context.Context, email string) error
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, password string) error
	ConfirmEmailChange(ctx context.Context, token string) error
}

type InviteService interface {
	Create(ctx context.Context, actor models.Actor, email string) (*models.Invite, string, error)
	List(ctx context.Context, actor models.Actor, page models.Page) ([]models.Invite, int64, error)
	Revoke(ctx context.Context, actor models.Actor, id uuid.UUID) error
	Preview(ctx context.Context, token string) (*models.InvitePreview, error)
	Accept(ctx context.Context, req models.AcceptInviteRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
}

type ProfileService interface {
	Get(ctx context.Context, userID uuid.UUID) (*models.User, error)
	Update(ctx context.Context, actor models.Actor, req models.UpdateProfileRequest) (*models.User, error)
	StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error)
	UnlinkTelegram(ctx context.Context, actor models.Actor) error
	RequestEmailChange(ctx context.Context, actor models.Actor, req models.ChangeEmailRequest) error
	Deactivate(ctx context.Context, actor models.Actor) error
}

type UserService interface {
	Search(ctx context.Context, actor models.Actor, query string, page models.Page) ([]models.UserSummary, int64, error)
	SetActive(ctx context.Context, actor models.Actor, userID uuid.UUID, active bool) error
	Delete(ctx context.Context, actor models.Actor, userID uuid.UUID) error
}

type EventService interface {
	Create(ctx context.Context, actor models.Actor, req models.CreateEventRequest) (*models.Event, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateEventRequest) (*models.Event, error)
	Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	List(ctx context.Context, actor models.Actor, filter models.EventFilter, page models.Page) ([]models.Event, int64, error)
	Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
}

type StageService interface {
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.Stage, *models.Event, error)
	Create(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateStageRequest) (*models.Stage, *models.Event, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateStageRequest) (*models.Stage, *models.Event, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}

type ParticipantService interface {
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID, filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error)
	AddMany(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.AddParticipantsRequest) (*models.BatchResult, error)
	RemoveMany(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.RemoveParticipantsRequest) (*models.BatchResult, error)
	UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string) (*models.ParticipantResponse, error)
	Reactivate(ctx context.Context, actor models.Actor, participantID uuid.UUID, role *string) (*models.ParticipantResponse, error)
	CopyFrom(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CopyParticipantsRequest) (*models.BatchResult, error)
}

type CatalogService interface {
	List(ctx context.Context, actor models.Actor, filter models.CatalogFilter, page models.Page) ([]models.CatalogEvent, int64, error)
	Join(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.JoinEventRequest) (*models.EventParticipant, error)
}

type RegistrationService interface {
	Get(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.Registration, error)
	Create(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateRegistrationRequest) (*models.Registration, error)
	Update(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.UpdateRegistrationRequest) (*models.Registration, error)
	SetState(ctx context.Context, actor models.Actor, eventID uuid.UUID, state models.RegistrationState) (*models.Registration, error)
}

type StatusService interface {
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID, page models.Page) ([]models.RegistrationStatusResponse, int64, error)
	MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.RegistrationStatusResponse, error)
	AdminChange(ctx context.Context, actor models.Actor, statusID uuid.UUID, req models.AdminChangeStatusRequest) (*models.RegistrationStatusResponse, error)
	BatchSet(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.BatchSetStatusRequest) (*models.BatchResult, error)
	BatchSetPreview(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.BatchSetStatusRequest) (*models.PreviewResponse, error)
}

type RuleService interface {
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.NotificationRule, error)
	Create(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateRuleRequest) (*models.NotificationRule, error)
	Update(ctx context.Context, actor models.Actor, ruleID uuid.UUID, req models.UpdateRuleRequest) (*models.NotificationRule, error)
	Disable(ctx context.Context, actor models.Actor, ruleID uuid.UUID) error
}

type QueryService interface {
	MyEvents(ctx context.Context, actor models.Actor, filter models.MyEventFilter, page models.Page) ([]models.MyEventItem, int64, error)
	EventCard(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.EventCard, error)
	MySchedule(ctx context.Context, actor models.Actor, filter models.ScheduleFilter) (*models.ScheduleResponse, error)
	AdminSchedule(ctx context.Context, actor models.Actor, filter models.ScheduleFilter) (*models.ScheduleResponse, error)
	Upcoming(ctx context.Context, actor models.Actor, within time.Duration, page models.Page) ([]models.DeadlineItem, int64, error)
	Overdue(ctx context.Context, actor models.Actor, page models.Page) ([]models.DeadlineItem, int64, error)
}

type AuditService interface {
	List(ctx context.Context, actor models.Actor, filter models.AuditFilter, page models.Page) ([]models.AuditResponse, int64, error)
}

type PreviewService interface {
	PreviewNotification(ctx context.Context, actor models.Actor, statusID uuid.UUID,
		ruleID *uuid.UUID) (*models.NotificationPreviewResponse, error)
}

type Limiter interface {
	Allow(key string, limit int, window time.Duration) bool
}

type OpsService interface {
	Ready(ctx context.Context) error
	Heartbeat(ctx context.Context) (*models.WorkerHeartbeatResponse, error)
	Queue(ctx context.Context, actor models.Actor, scope string,
		page models.Page) ([]models.QueueEntryResponse, int64, error)
}
