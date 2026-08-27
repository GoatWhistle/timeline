package cli

import (
	"context"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/email"
	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/ratelimit"
	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/telegram"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/services"
)

type container struct {
	cfg *config.Config
	db  *repositories.DB

	repos struct {
		users         *repositories.UserRepository
		sessions      *repositories.SessionRepository
		tokens        *repositories.TokenRepository
		invites       *repositories.InviteRepository
		events        *repositories.EventRepository
		stages        *repositories.StageRepository
		participants  *repositories.ParticipantRepository
		registrations *repositories.RegistrationRepository
		statuses      *repositories.StatusRepository
		rules         *repositories.RuleRepository
		notifications *repositories.NotificationRepository
		scheduler     *repositories.SchedulerRepository
		queries       *repositories.QueryRepository
		audit         *repositories.AuditRepository
	}

	telegram telegram.Sender
	email    email.Sender
	hasher   *services.PasswordHasher

	auth          *services.AuthService
	invites       *services.InviteService
	profile       *services.ProfileService
	users         *services.UserService
	events        *services.EventService
	stages        *services.StageService
	participants  *services.ParticipantService
	registrations *services.RegistrationService
	statuses      *services.StatusService
	rules         *services.RuleService
	queries       *services.QueryService
	audit         *services.AuditService
	notifier      *services.NotificationService
	scheduler     *services.SchedulerService
	delivery      *services.DeliveryService
	ops           *services.OpsService
}

func newContainer(ctx context.Context) (*container, error) {
	cfg, err := loadConfig()
	if err != nil {
		return nil, err
	}
	db, err := repositories.Connect(ctx, cfg.DB)
	if err != nil {
		return nil, err
	}

	c := &container{cfg: cfg, db: db}
	c.repos.users = repositories.NewUserRepository(db)
	c.repos.sessions = repositories.NewSessionRepository(db)
	c.repos.tokens = repositories.NewTokenRepository(db)
	c.repos.invites = repositories.NewInviteRepository(db)
	c.repos.events = repositories.NewEventRepository(db)
	c.repos.stages = repositories.NewStageRepository(db)
	c.repos.participants = repositories.NewParticipantRepository(db)
	c.repos.registrations = repositories.NewRegistrationRepository(db)
	c.repos.statuses = repositories.NewStatusRepository(db)
	c.repos.rules = repositories.NewRuleRepository(db)
	c.repos.notifications = repositories.NewNotificationRepository(db)
	c.repos.scheduler = repositories.NewSchedulerRepository(db)
	c.repos.queries = repositories.NewQueryRepository(db)
	c.repos.audit = repositories.NewAuditRepository(db)

	c.telegram = telegram.New(cfg.Telegram)
	c.email = email.New(cfg.Email)
	c.hasher = services.NewPasswordHasher(cfg.Argon)
	limiter := ratelimit.New()
	issuer := services.NewTokenIssuer(cfg.Auth)
	mailer := services.NewMailer(c.email, cfg.App.PublicURL)

	c.audit = services.NewAuditService(c.repos.audit)
	c.notifier = services.NewNotificationService(c.repos.notifications, cfg)
	c.scheduler = services.NewSchedulerService(db, c.repos.scheduler, c.notifier, cfg)

	c.auth = services.NewAuthService(db, c.repos.users, c.repos.sessions, c.repos.tokens, c.repos.invites,
		c.notifier, c.audit, c.hasher, issuer, mailer, limiter, cfg)
	c.invites = services.NewInviteService(db, c.repos.invites, c.repos.users, c.auth, c.audit, mailer, limiter, cfg)
	c.profile = services.NewProfileService(db, c.repos.users, c.repos.tokens, c.repos.sessions,
		c.notifier, c.audit, c.hasher, mailer, c.telegram, cfg)
	c.users = services.NewUserService(db, c.repos.users, c.repos.sessions, c.notifier, c.audit)
	c.events = services.NewEventService(db, c.repos.events, c.repos.registrations,
		c.notifier, c.scheduler, c.audit)
	c.stages = services.NewStageService(db, c.repos.stages, c.repos.events, c.repos.participants, c.audit)
	c.participants = services.NewParticipantService(db, c.repos.participants, c.repos.events,
		c.repos.registrations, c.repos.statuses, c.repos.users, c.notifier, c.audit)
	c.registrations = services.NewRegistrationService(db, c.repos.registrations, c.repos.events,
		c.repos.participants, c.repos.statuses, c.repos.users, c.notifier, c.scheduler, c.audit)
	c.statuses = services.NewStatusService(db, c.repos.statuses, c.repos.registrations, c.repos.participants,
		c.repos.events, c.repos.users, c.notifier, c.scheduler, c.audit)
	c.rules = services.NewRuleService(db, c.repos.rules, c.repos.registrations, c.notifier, c.scheduler, c.audit, cfg)
	c.queries = services.NewQueryService(c.repos.queries, c.repos.events, c.repos.stages,
		c.repos.participants, c.repos.registrations, c.repos.statuses)
	c.delivery = services.NewDeliveryService(c.repos.notifications, c.repos.scheduler, c.repos.users,
		c.repos.rules, c.repos.audit, c.telegram, c.email, cfg)
	c.ops = services.NewOpsService(db, c.repos.scheduler, c.repos.notifications, cfg)
	return c, nil
}

func (c *container) Close() { c.db.Close() }
