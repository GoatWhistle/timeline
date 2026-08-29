//go:build integration

package authz_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

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
	"github.com/GoatWhistle/timeline/internal/controllers"
	"github.com/GoatWhistle/timeline/internal/services"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type stack struct {
	server   *httptest.Server
	db       *postgres.DB
	cfg      *config.Config
	users    *identity.Users
	sessions *identity.Sessions
	events   *event.Events
	feed     *services.SystemEventService
	feedRepo *systemevent.Events
	hub      *services.RealtimeHub
}

func newStack(t *testing.T) *stack {
	t.Helper()

	pool := testsupport.Pool(t)
	db := postgres.NewDB(pool)

	t.Setenv("SYSTEM_TIMEZONE", "UTC")
	t.Setenv("JWT_SECRET", "authz-integration-secret-value-0123456789")
	t.Setenv("DATABASE_URL", os.Getenv("DATABASE_URL"))
	t.Setenv("ARGON2_MEMORY_KIB", "8192")
	t.Setenv("ARGON2_ITERATIONS", "1")
	t.Setenv("ARGON2_PARALLELISM", "1")
	t.Setenv("RATE_LIMIT_CATALOG_REQUESTS", "3")
	t.Setenv("RATE_LIMIT_CATALOG_WINDOW", "1m")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("loading configuration: %v", err)
	}

	users := identity.NewUsers(db)
	sessions := identity.NewSessions(db)
	tokens := identity.NewTokens(db)
	invites := identity.NewInvites(db)
	events := event.NewEvents(db)
	stages := event.NewStages(db)
	participants := participation.NewParticipants(db)
	registrations := participation.NewRegistrations(db)
	statuses := participation.NewStatuses(db)
	rules := participation.NewRules(db)
	notifications := notification.NewNotifications(db)
	scheduleRepo := notification.NewScheduler(db)
	catalogRepo := query.NewCatalog(db)
	queries := query.NewTimeline(db)
	auditRepo := audit.NewAudit(db)
	feedRepo := systemevent.NewEvents(db)
	tasksRepo := personal.NewTasks(db)
	notesRepo := personal.NewNotes(db)
	artifactsRepo := personal.NewArtifacts(db)
	outcomesRepo := personal.NewOutcomes(db)
	bookmarksRepo := personal.NewBookmarks(db)
	templatesRepo := personal.NewTemplates(db)
	historyRepo := personal.NewHistory(db)
	retrosRepo := personal.NewRetrospectives(db)

	hasher := services.NewPasswordHasher(cfg.Argon)
	issuer := services.NewTokenIssuer(cfg.Auth)
	limiter := ratelimit.New()
	mailer := services.NewMailer(email.New(cfg.Email), cfg.App.PublicURL)
	tg := telegram.New(cfg.Telegram)

	auditSvc := services.NewAuditService(auditRepo)
	personalSvc := services.NewPersonalService(db, tasksRepo, notesRepo, artifactsRepo,
		outcomesRepo, bookmarksRepo, templatesRepo, historyRepo,
		events, stages, participants, cfg.Personal)
	personalSvc.WithRetrospectives(retrosRepo)
	linksRepo := resourcelink.NewLinks(db)
	userLinksRepo := resourcelink.NewPersonalLinks(db)
	notifier := services.NewNotificationService(notifications, cfg)
	scheduler := services.NewSchedulerService(db, scheduleRepo, rules, notifier, cfg)
	auth := services.NewAuthService(db, users, sessions, tokens, invites,
		notifier, auditSvc, hasher, issuer, mailer, limiter, cfg)
	feed := services.NewSystemEventService(db, feedRepo)
	hub := services.NewRealtimeHub(feedRepo, cfg.Realtime.MaxPerUser)
	profileSvc := services.NewProfileService(db, users, tokens, sessions,
		notifier, auditSvc, hasher, mailer, tg, cfg)
	userSvc := services.NewUserService(db, users, sessions, notifier, auditSvc)
	auth.WithRealtime(hub)
	profileSvc.WithRealtime(hub)
	userSvc.WithRealtime(hub)

	deps := controllers.Deps{
		Auth:    auth,
		Invites: services.NewInviteService(db, invites, users, auth, auditSvc, mailer, limiter, cfg),
		Profile: profileSvc,
		Users:   userSvc,
		Events:  services.NewEventService(db, events, registrations, notifier, scheduler, auditSvc),
		Catalog: services.NewCatalogService(db, catalogRepo, events, participants,
			registrations, statuses, users, notifier, auditSvc),
		Stages: services.NewStageService(db, stages, events, participants, auditSvc),
		Participants: services.NewParticipantService(db, participants, events,
			registrations, statuses, users, notifier, auditSvc),
		Registrations: services.NewRegistrationService(db, registrations, events,
			participants, statuses, users, notifier, scheduler, auditSvc),
		Statuses: services.NewStatusService(db, statuses, registrations, participants,
			events, users, notifier, scheduler, auditSvc),
		Rules:    services.NewRuleService(db, rules, registrations, notifier, scheduler, auditSvc, cfg),
		Queries:  services.NewQueryService(queries, events, stages, participants, registrations, statuses),
		Audit:    auditSvc,
		Ops:      services.NewOpsService(db, scheduleRepo, notifications, cfg),
		Previews: scheduler,
		Personal: personalSvc,
		Links: services.NewResourceLinkService(db, linksRepo, userLinksRepo,
			events, stages, participants, auditSvc, cfg.Links),
		Feed:          feed,
		Notifications: notifier,
		Realtime:      hub,
		Sessions:      auth,

		Authenticator:      auth,
		Limiter:            limiter,
		CatalogRate:        cfg.RateLim.CatalogRequests,
		CatalogRateWindow:  cfg.RateLim.CatalogWindow,
		SessionRate:        cfg.RateLim.SessionRequests,
		SessionRateWindow:  cfg.RateLim.SessionWindow,
		PreviewRate:        cfg.RateLim.PreviewRequests,
		PreviewRateWindow:  cfg.RateLim.PreviewWindow,
		QueueRate:          cfg.RateLim.QueueRequests,
		QueueRateWindow:    cfg.RateLim.QueueWindow,
		PersonalRate:       cfg.RateLim.PersonalRequests,
		PersonalRateWindow: cfg.RateLim.PersonalWindow,
		LinkRate:           cfg.RateLim.LinkRequests,
		LinkRateWindow:     cfg.RateLim.LinkWindow,
		FeedRate:           cfg.RateLim.FeedRequests,
		FeedRateWindow:     cfg.RateLim.FeedWindow,
		RealtimeRate:       cfg.RateLim.RealtimeAttempts,
		RealtimeRateWindow: cfg.RateLim.RealtimeWindow,
		RealtimePing:       cfg.Realtime.PingInterval,

		Cookies:      controllers.CookieOptions{},
		PublicURL:    cfg.App.PublicURL,
		PageDefault:  cfg.Ops.PageSizeDef,
		PageMax:      cfg.Ops.PageSizeMax,
		UserPageSize: cfg.Ops.UserSearchPageSize,
		CSRFTTL:      cfg.Auth.RefreshTTL,
	}

	server := httptest.NewServer(controllers.NewRouter(deps))
	t.Cleanup(server.Close)

	return &stack{
		server: server, db: db, cfg: cfg,
		users: users, sessions: sessions, events: events,
		feed: feed, feedRepo: feedRepo, hub: hub,
	}
}

func (s *stack) url(path string) string { return s.server.URL + "/api/v1" + path }

func (s *stack) transport() http.RoundTripper { return s.server.Client().Transport }

func (s *stack) accessTTL() time.Duration { return s.cfg.Auth.AccessTTL }
