//go:build integration

package apitest

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
	svcauth "github.com/GoatWhistle/timeline/internal/services/auth"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
	svcevent "github.com/GoatWhistle/timeline/internal/services/event"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcparticipation "github.com/GoatWhistle/timeline/internal/services/participation"
	svcpersonal "github.com/GoatWhistle/timeline/internal/services/personal"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
	svcscheduler "github.com/GoatWhistle/timeline/internal/services/scheduler"
	sharedaudit "github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type Stack struct {
	Server   *httptest.Server
	DB       *postgres.DB
	Cfg      *config.Config
	Feed     *svcrealtime.SystemEventService
	Calendar *identity.CalendarFeeds
}

func NewStack(t *testing.T) *Stack {
	t.Helper()

	pool := testsupport.Pool(t)
	db := postgres.NewDB(pool)

	t.Setenv("SYSTEM_TIMEZONE", "UTC")
	t.Setenv("JWT_SECRET", "apitest-integration-secret-value-0123456789")
	t.Setenv("DATABASE_URL", os.Getenv("DATABASE_URL"))
	t.Setenv("ARGON2_MEMORY_KIB", "8192")
	t.Setenv("ARGON2_ITERATIONS", "1")
	t.Setenv("ARGON2_PARALLELISM", "1")
	t.Setenv("RATE_LIMIT_CATALOG_REQUESTS", "3")
	t.Setenv("RATE_LIMIT_CATALOG_WINDOW", "1m")
	t.Setenv("RATE_LIMIT_ICS_REQUESTS", "4")
	t.Setenv("RATE_LIMIT_ICS_WINDOW", "1m")

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
	calendarRepo := identity.NewCalendarFeeds(db)

	hasher := crypto.NewPasswordHasher(cfg.Argon)
	issuer := crypto.NewTokenIssuer(cfg.Auth)
	limiter := ratelimit.New()
	mailer := mail.NewMailer(email.New(cfg.Email), cfg.App.PublicURL)
	tg := telegram.New(cfg.Telegram)

	auditSvc := sharedaudit.NewAuditService(auditRepo)
	personalSvc := svcpersonal.NewPersonalService(db, tasksRepo, notesRepo, artifactsRepo,
		outcomesRepo, bookmarksRepo, templatesRepo, historyRepo,
		events, stages, participants, cfg.Personal)
	personalSvc.WithRetrospectives(retrosRepo)
	linksRepo := resourcelink.NewLinks(db)
	userLinksRepo := resourcelink.NewPersonalLinks(db)
	notifier := svcnotification.NewNotificationService(notifications, cfg)
	scheduler := svcscheduler.NewSchedulerService(db, scheduleRepo, rules, statuses, notifier, cfg)
	auth := svcauth.NewAuthService(db, users, sessions, tokens, invites,
		notifier, auditSvc, hasher, issuer, mailer, limiter, cfg)
	feed := svcrealtime.NewSystemEventService(db, feedRepo)
	hub := svcrealtime.NewRealtimeHub(feedRepo, cfg.Realtime.MaxPerUser)
	profileSvc := svcauth.NewProfileService(db, users, tokens, sessions,
		notifier, auditSvc, hasher, mailer, tg, cfg)
	userSvc := svcauth.NewUserService(db, users, sessions, notifier, auditSvc)
	auth.WithRealtime(hub)
	profileSvc.WithRealtime(hub)
	userSvc.WithRealtime(hub)
	userSvc.WithCalendarFeeds(calendarRepo)
	profileSvc.WithCalendarFeeds(calendarRepo)

	deps := controllers.Deps{
		Auth:    auth,
		Invites: svcauth.NewInviteService(db, invites, users, auth, auditSvc, mailer, limiter, cfg),
		Profile: profileSvc,
		Users:   userSvc,
		Events:  svcevent.NewEventService(db, events, registrations, notifier, scheduler, auditSvc),
		Catalog: svcevent.NewCatalogService(db, catalogRepo, events, participants,
			registrations, statuses, users, notifier, auditSvc),
		Stages: svcevent.NewStageService(db, stages, events, participants, auditSvc),
		Participants: svcparticipation.NewParticipantService(db, participants, events,
			registrations, statuses, users, notifier, auditSvc),
		Registrations: svcparticipation.NewRegistrationService(db, registrations, events,
			participants, statuses, users, notifier, scheduler, auditSvc),
		Statuses: svcparticipation.NewStatusService(db, statuses, registrations, participants,
			events, users, notifier, scheduler, auditSvc),
		Rules:    svcparticipation.NewRuleService(db, rules, events, registrations, notifier, scheduler, auditSvc, cfg),
		Queries:  svcevent.NewQueryService(queries, events, stages, participants, registrations, statuses),
		Audit:    auditSvc,
		Ops:      svcdelivery.NewOpsService(db, scheduleRepo, notifications, cfg),
		Previews: scheduler,
		Personal: personalSvc,
		Links: svcevent.NewResourceLinkService(db, linksRepo, userLinksRepo,
			events, stages, participants, auditSvc, cfg.Links),
		Feed: feed,
		CalendarFeeds: svcauth.NewCalendarFeedService(db, calendarRepo, users,
			queries, auditSvc, cfg.App.PublicURL),
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
		CalendarRate:       cfg.RateLim.CalendarRequests,
		CalendarRateWindow: cfg.RateLim.CalendarWindow,
		ICSRate:            cfg.RateLim.ICSRequests,
		ICSRateWindow:      cfg.RateLim.ICSWindow,

		Cookies:      controllers.CookieOptions{},
		PublicURL:    cfg.App.PublicURL,
		PageDefault:  cfg.Ops.PageSizeDef,
		PageMax:      cfg.Ops.PageSizeMax,
		UserPageSize: cfg.Ops.UserSearchPageSize,
		CSRFTTL:      cfg.Auth.RefreshTTL,
	}

	server := httptest.NewServer(controllers.NewRouter(deps))
	t.Cleanup(server.Close)

	return &Stack{
		Server: server, DB: db, Cfg: cfg,
		Feed: feed, Calendar: calendarRepo,
	}
}

func (s *Stack) URL(path string) string { return s.Server.URL + "/api/v1" + path }

func (s *Stack) Transport() http.RoundTripper { return s.Server.Client().Transport }

func (s *Stack) AccessTTL() time.Duration { return s.Cfg.Auth.AccessTTL }
