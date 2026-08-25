// Package controllers содержит HTTP-контроллеры, аннотации OpenAPI и сборку роутера.
// Контроллер разбирает запрос, вызывает сервис и рендерит ответ; SQL и бизнес-правила
// в этом слое отсутствуют.
package controllers

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// AuthService — аутентификация, сессии и восстановление доступа.
type AuthService interface {
	Register(ctx context.Context, req models.RegisterRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Login(ctx context.Context, req models.LoginRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	LogoutAll(ctx context.Context, actor models.Actor) error
	VerifyEmail(ctx context.Context, token string) error
	ResendVerification(ctx context.Context, email string) error
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, password string) error
	ConfirmEmailChange(ctx context.Context, token string) error
}

// InviteService — приглашения на регистрацию.
type InviteService interface {
	Create(ctx context.Context, actor models.Actor, email string) (*models.Invite, string, error)
	List(ctx context.Context, actor models.Actor, page models.Page) ([]models.Invite, int64, error)
	Revoke(ctx context.Context, actor models.Actor, id uuid.UUID) error
	Preview(ctx context.Context, token string) (*models.InvitePreview, error)
	Accept(ctx context.Context, req models.AcceptInviteRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
}

// ProfileService — собственный профиль пользователя и каналы доставки.
type ProfileService interface {
	Get(ctx context.Context, userID uuid.UUID) (*models.User, error)
	Update(ctx context.Context, actor models.Actor, req models.UpdateProfileRequest) (*models.User, error)
	StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error)
	UnlinkTelegram(ctx context.Context, actor models.Actor) error
	RequestEmailChange(ctx context.Context, actor models.Actor, req models.ChangeEmailRequest) error
	Deactivate(ctx context.Context, actor models.Actor) error
}

// UserService — административные операции над учётными записями.
type UserService interface {
	Search(ctx context.Context, actor models.Actor, query string, page models.Page) ([]models.UserSummary, int64, error)
	SetActive(ctx context.Context, actor models.Actor, userID uuid.UUID, active bool) error
	Delete(ctx context.Context, actor models.Actor, userID uuid.UUID) error
}

// HackathonService — хакатоны и их жизненный цикл.
type HackathonService interface {
	Create(ctx context.Context, actor models.Actor, req models.CreateHackathonRequest) (*models.Hackathon, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateHackathonRequest) (*models.Hackathon, error)
	Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error)
	List(ctx context.Context, actor models.Actor, filter models.HackathonFilter, page models.Page) ([]models.Hackathon, int64, error)
	Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error)
	Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error)
}

// StageService — этапы хакатона.
type StageService interface {
	List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) ([]models.Stage, error)
	Create(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.CreateStageRequest) (*models.Stage, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateStageRequest) (*models.Stage, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}

// ParticipantService — назначения участников и массовые операции над составом.
type ParticipantService interface {
	List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error)
	AddMany(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.AddParticipantsRequest) (*models.BatchResult, error)
	RemoveMany(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.RemoveParticipantsRequest) (*models.BatchResult, error)
	UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID, role string) (*models.ParticipantResponse, error)
	Reactivate(ctx context.Context, actor models.Actor, participantID uuid.UUID, role string) (*models.ParticipantResponse, error)
	CopyFrom(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.CopyParticipantsRequest) (*models.BatchResult, error)
}

// RegistrationService — регистрация хакатона и её версии.
type RegistrationService interface {
	Get(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) (*models.Registration, error)
	Create(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.CreateRegistrationRequest) (*models.Registration, error)
	Update(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.UpdateRegistrationRequest) (*models.Registration, error)
	SetState(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, state models.RegistrationState) (*models.Registration, error)
}

// StatusService — статусы внешней регистрации участников.
type StatusService interface {
	List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, page models.Page) ([]models.RegistrationStatusResponse, int64, error)
	MarkDone(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) (*models.RegistrationStatusResponse, error)
	AdminChange(ctx context.Context, actor models.Actor, statusID uuid.UUID, req models.AdminChangeStatusRequest) (*models.RegistrationStatusResponse, error)
	BatchSet(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.BatchSetStatusRequest) (*models.BatchResult, error)
	BatchSetPreview(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.BatchSetStatusRequest) (*models.PreviewResponse, error)
}

// RuleService — правила напоминаний регистрации.
type RuleService interface {
	List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) ([]models.NotificationRule, error)
	Create(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.CreateRuleRequest) (*models.NotificationRule, error)
	Update(ctx context.Context, actor models.Actor, ruleID uuid.UUID, req models.UpdateRuleRequest) (*models.NotificationRule, error)
	Disable(ctx context.Context, actor models.Actor, ruleID uuid.UUID) error
}

// QueryService — read-модели пользовательских и административных экранов.
type QueryService interface {
	MyHackathons(ctx context.Context, actor models.Actor, filter models.MyHackathonFilter, page models.Page) ([]models.MyHackathonItem, int64, error)
	HackathonCard(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) (*models.HackathonCard, error)
	MyTimeline(ctx context.Context, actor models.Actor, filter models.TimelineFilter) (*models.TimelineResponse, error)
	AdminTimeline(ctx context.Context, actor models.Actor, filter models.TimelineFilter) (*models.TimelineResponse, error)
	Upcoming(ctx context.Context, actor models.Actor, within time.Duration, page models.Page) ([]models.DeadlineItem, int64, error)
	Overdue(ctx context.Context, actor models.Actor, page models.Page) ([]models.DeadlineItem, int64, error)
}

// AuditService — чтение журнала административных изменений.
type AuditService interface {
	List(ctx context.Context, actor models.Actor, filter models.AuditFilter, page models.Page) ([]models.AuditResponse, int64, error)
}

// OpsService — служебные проверки состояния системы.
type OpsService interface {
	Ready(ctx context.Context) error
	Heartbeat(ctx context.Context) (*models.WorkerHeartbeatResponse, error)
}
