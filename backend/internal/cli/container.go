package cli

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/adapters/email"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/resourcelink"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/adapters/ratelimit"
	"github.com/GoatWhistle/timeline/internal/adapters/telegram"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/services"
)

type container struct {
	cfg *config.Config
	db  *postgres.DB

	repos struct {
		users         *identity.Users
		sessions      *identity.Sessions
		tokens        *identity.Tokens
		invites       *identity.Invites
		events        *event.Events
		stages        *event.Stages
		participants  *participation.Participants
		registrations *participation.Registrations
		statuses      *participation.Statuses
		rules         *participation.Rules
		notifications *notification.Notifications
		scheduler     *notification.Scheduler
		catalog       *query.Catalog
		tasks         *personal.Tasks
		notes         *personal.Notes
		artifacts     *personal.Artifacts
		outcomes      *personal.Outcomes
		bookmarks     *personal.Bookmarks
		templates     *personal.Templates
		history       *personal.History
		links         *resourcelink.Links
		userLinks     *resourcelink.PersonalLinks
		queries       *query.Timeline
		feed          *systemevent.Events
		audit         *audit.Audit
	}

	telegram telegram.Sender
	email    email.Sender
	hasher   *services.PasswordHasher
	limiter  *ratelimit.Limiter

	auth          *services.AuthService
	invites       *services.InviteService
	profile       *services.ProfileService
	users         *services.UserService
	events        *services.EventService
	catalog       *services.CatalogService
	stages        *services.StageService
	participants  *services.ParticipantService
	registrations *services.RegistrationService
	statuses      *services.StatusService
	rules         *services.RuleService
	queries       *services.QueryService
	audit         *services.AuditService
	personal      *services.PersonalService
	links         *services.ResourceLinkService
	notifier      *services.NotificationService
	scheduler     *services.SchedulerService
	delivery      *services.DeliveryService
	ops           *services.OpsService
	feed          *services.SystemEventService
	hub           *services.RealtimeHub
}

func newContainer(ctx context.Context) (*container, error) {
	cfg, err := loadConfig()
	if err != nil {
		return nil, err
	}
	db, err := postgres.Connect(ctx, cfg.DB)
	if err != nil {
		return nil, err
	}

	c := &container{cfg: cfg, db: db}
	c.repos.users = identity.NewUsers(db)
	c.repos.sessions = identity.NewSessions(db)
	c.repos.tokens = identity.NewTokens(db)
	c.repos.invites = identity.NewInvites(db)
	c.repos.events = event.NewEvents(db)
	c.repos.stages = event.NewStages(db)
	c.repos.participants = participation.NewParticipants(db)
	c.repos.registrations = participation.NewRegistrations(db)
	c.repos.statuses = participation.NewStatuses(db)
	c.repos.rules = participation.NewRules(db)
	c.repos.notifications = notification.NewNotifications(db)
	c.repos.scheduler = notification.NewScheduler(db)
	c.repos.catalog = query.NewCatalog(db)
	c.repos.tasks = personal.NewTasks(db)
	c.repos.notes = personal.NewNotes(db)
	c.repos.artifacts = personal.NewArtifacts(db)
	c.repos.outcomes = personal.NewOutcomes(db)
	c.repos.bookmarks = personal.NewBookmarks(db)
	c.repos.templates = personal.NewTemplates(db)
	c.repos.history = personal.NewHistory(db)
	c.repos.links = resourcelink.NewLinks(db)
	c.repos.userLinks = resourcelink.NewPersonalLinks(db)
	c.repos.queries = query.NewTimeline(db)
	c.repos.feed = systemevent.NewEvents(db)
	c.repos.audit = audit.NewAudit(db)

	c.telegram = telegram.New(cfg.Telegram)
	c.email = email.New(cfg.Email)
	c.hasher = services.NewPasswordHasher(cfg.Argon)
	c.limiter = ratelimit.New()
	limiter := c.limiter
	issuer := services.NewTokenIssuer(cfg.Auth)
	mailer := services.NewMailer(c.email, cfg.App.PublicURL)

	c.audit = services.NewAuditService(c.repos.audit)
	c.notifier = services.NewNotificationService(c.repos.notifications, cfg)
	c.scheduler = services.NewSchedulerService(db, c.repos.scheduler, c.repos.rules, c.notifier, cfg)

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
	c.catalog = services.NewCatalogService(db, c.repos.catalog, c.repos.events, c.repos.participants,
		c.repos.registrations, c.repos.statuses, c.repos.users, c.notifier, c.audit)
	c.queries = services.NewQueryService(c.repos.queries, c.repos.events, c.repos.stages,
		c.repos.participants, c.repos.registrations, c.repos.statuses)
	c.delivery = services.NewDeliveryService(db, c.repos.notifications, c.repos.scheduler, c.repos.users,
		c.repos.rules, c.repos.audit, c.telegram, c.email, cfg)
	c.personal = services.NewPersonalService(db, c.repos.tasks, c.repos.notes, c.repos.artifacts,
		c.repos.outcomes, c.repos.bookmarks, c.repos.templates, c.repos.history,
		c.repos.events, c.repos.stages, c.repos.participants, cfg.Personal)
	c.links = services.NewResourceLinkService(db, c.repos.links, c.repos.userLinks,
		c.repos.events, c.repos.stages, c.repos.participants, c.audit, cfg.Links)
	c.ops = services.NewOpsService(db, c.repos.scheduler, c.repos.notifications, cfg)
	c.feed = services.NewSystemEventService(db, c.repos.feed)
	c.hub = services.NewRealtimeHub(c.repos.feed, cfg.Realtime.MaxPerUser)
	c.delivery.WithEvents(c.feed)
	c.auth.WithRealtime(c.hub)
	c.users.WithRealtime(c.hub)
	c.profile.WithRealtime(c.hub)
	return c, nil
}

func (c *container) Close() { c.db.Close() }
