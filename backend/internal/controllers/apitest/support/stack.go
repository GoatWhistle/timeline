//go:build integration

package support

import (
	"net/http/httptest"
	"os"
	"testing"

	"github.com/GoatWhistle/timeline/internal/adapters/email"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	pgfinance "github.com/GoatWhistle/timeline/internal/adapters/postgres/finance"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	pginbox "github.com/GoatWhistle/timeline/internal/adapters/postgres/inbox"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/resourcelink"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/team"
	"github.com/GoatWhistle/timeline/internal/adapters/ratelimit"
	"github.com/GoatWhistle/timeline/internal/adapters/telegram"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/controllers"
	svcauth "github.com/GoatWhistle/timeline/internal/services/auth"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
	svcevent "github.com/GoatWhistle/timeline/internal/services/event"
	svcfinance "github.com/GoatWhistle/timeline/internal/services/finance"
	svcinbox "github.com/GoatWhistle/timeline/internal/services/inbox"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcparticipation "github.com/GoatWhistle/timeline/internal/services/participation"
	svcpersonal "github.com/GoatWhistle/timeline/internal/services/personal"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
	svcretention "github.com/GoatWhistle/timeline/internal/services/retention"
	svcscheduler "github.com/GoatWhistle/timeline/internal/services/scheduler"
	sharedaudit "github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type Stack struct {
	server    *httptest.Server
	db        *postgres.DB
	cfg       *config.Config
	users     *identity.Users
	sessions  *identity.Sessions
	events    *event.Events
	eventSvc  *svcevent.EventService
	retention *svcretention.Service
	auth      *svcauth.AuthService
	feed      *svcrealtime.SystemEventService
	feedRepo  *systemevent.Events
	hub       *svcrealtime.RealtimeHub
}

func NewStack(t *testing.T) *Stack {
	t.Helper()

	pool := testsupport.Pool(t)
	db := postgres.NewDB(pool)

	t.Setenv("SYSTEM_TIMEZONE", "UTC")
	t.Setenv("JWT_SECRET", "apitest-integration-secret-value-012345678")
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
	events := event.NewEvents(db)
	stages := event.NewStages(db)
	participants := participation.NewParticipants(db)
	registrations := participation.NewRegistrations(db)
	statuses := participation.NewStatuses(db)
	reminderSchedules := identity.NewReminderSchedules(db)
	notifications := notification.NewNotifications(db)
	notificationPreferences := notification.NewPreferences(db)
	scheduleRepo := notification.NewScheduler(db)
	catalogRepo := query.NewCatalog(db)
	queries := query.NewTimeline(db)
	auditRepo := audit.NewAudit(db)
	feedRepo := systemevent.NewEvents(db)
	tasksRepo := personal.NewTasks(db)
	notesRepo := personal.NewNotes(db)
	artifactsRepo := personal.NewArtifacts(db)
	outcomesRepo := personal.NewOutcomes(db)
	templatesRepo := personal.NewTemplates(db)
	historyRepo := personal.NewHistory(db)
	retrosRepo := personal.NewRetrospectives(db)
	teamsRepo := team.NewTeams(db)
	teamMembersRepo := team.NewMembers(db)
	teamEntriesRepo := team.NewEntries(db)
	teamRostersRepo := team.NewRosters(db)
	teamLinksRepo := team.NewJoinLinks(db)
	teamEventLinksRepo := team.NewEventLinks(db)

	hasher := crypto.NewPasswordHasher(cfg.Argon)
	issuer := crypto.NewTokenIssuer(cfg.Auth)
	limiter := ratelimit.New()
	mailer := mail.NewMailer(email.New(cfg.Email), telegram.New(cfg.Telegram), cfg.App.PublicURL)
	tg := telegram.New(cfg.Telegram)

	auditSvc := sharedaudit.NewAuditService(auditRepo)
	personalSvc := svcpersonal.NewPersonalService(db, tasksRepo, notesRepo, artifactsRepo,
		outcomesRepo, templatesRepo, historyRepo,
		events, stages, participants, cfg.Personal)
	personalSvc.WithRetrospectives(retrosRepo)
	linksRepo := resourcelink.NewLinks(db)
	notifier := svcnotification.NewNotificationService(notifications, notificationPreferences, cfg)
	scheduler := svcscheduler.NewSchedulerService(db, scheduleRepo, statuses, notifier, cfg)
	auth := svcauth.NewAuthService(db, users, sessions, tokens,
		notifier, auditSvc, hasher, issuer, mailer, limiter, cfg)
	feed := svcrealtime.NewSystemEventService(db, feedRepo)
	hub := svcrealtime.NewRealtimeHub(feedRepo, cfg.Realtime.MaxPerUser)
	profileLinksRepo := identity.NewProfileLinks(db)
	profileSvc := svcauth.NewProfileService(db, users, tokens, sessions,
		notifier, notificationPreferences, reminderSchedules, events, profileLinksRepo,
		auditSvc, hasher, mailer, tg, cfg)
	userSvc := svcauth.NewUserService(db, users, sessions, notifier, auditSvc, cfg)
	auth.WithRealtime(hub)
	profileSvc.WithRealtime(hub)
	userSvc.WithRealtime(hub)

	tracksRepo := event.NewTracks(db)
	casesRepo := pgfinance.NewCases(db)
	eventSvc := svcevent.NewEventService(db, events, tracksRepo, registrations, notifier, scheduler, auditSvc)
	querySvc := svcevent.NewQueryService(queries, events, stages, tracksRepo, participants, registrations, statuses)
	retentionSvc := svcretention.NewService(events, users, auditSvc)

	statusSvc := svcparticipation.NewStatusService(db, statuses, registrations, participants,
		events, users, notifier, scheduler, auditSvc)
	inboxRepo := pginbox.NewItems(db)
	inboxSvc := svcinbox.NewService(inboxRepo, statusSvc)
	inboxSvc.WithNotifier(feed)

	deps := controllers.Deps{
		Auth:           auth,
		Profile:        profileSvc,
		PublicProfiles: profileSvc,
		Users:          userSvc,
		Events:         eventSvc,
		Catalog: svcevent.NewCatalogService(db, catalogRepo, events, participants,
			registrations, statuses, users, notifier, auditSvc),
		Stages:  svcevent.NewStageService(db, stages, events, participants, auditSvc),
		Tracks:  svcevent.NewTrackService(db, tracksRepo, events, participants, auditSvc),
		Finance: svcfinance.NewFinanceService(casesRepo, tracksRepo, events),
		Cases:   svcfinance.NewCaseService(db, casesRepo, tracksRepo, events, auditSvc),
		Participants: svcparticipation.NewParticipantService(db, participants, events,
			registrations, statuses, users, notifier, auditSvc),
		Registrations: svcparticipation.NewRegistrationService(db, registrations, events,
			participants, statuses, users, notifier, scheduler, auditSvc),
		Statuses: statusSvc,
		Queries:  querySvc,
		Audit:    auditSvc,
		Ops:      svcdelivery.NewOpsService(db),
		Previews: scheduler,
		Personal: personalSvc,
		Links: svcevent.NewResourceLinkService(db, linksRepo,
			events, stages, participants, auditSvc, cfg.Links),
		Retention: retentionSvc,
		Feed:      feed,
		Inbox:     inboxSvc,
		Teams: svcteam.NewTeamService(db, teamsRepo, teamMembersRepo, teamEntriesRepo, teamRostersRepo, teamLinksRepo,
			teamEventLinksRepo, events, tracksRepo, participants, registrations, statuses, users, notifier, auditSvc, cfg),
		Realtime: hub,
		Sessions: auth,

		Authenticator:      auth,
		Limiter:            limiter,
		CatalogRate:        cfg.RateLim.CatalogRequests,
		CatalogRateWindow:  cfg.RateLim.CatalogWindow,
		ProfileRate:        cfg.RateLim.ProfileRequests,
		ProfileRateWindow:  cfg.RateLim.ProfileWindow,
		PublicRate:         cfg.RateLim.PublicRequests,
		PublicRateWindow:   cfg.RateLim.PublicWindow,
		SessionRate:        cfg.RateLim.SessionRequests,
		SessionRateWindow:  cfg.RateLim.SessionWindow,
		PreviewRate:        cfg.RateLim.PreviewRequests,
		PreviewRateWindow:  cfg.RateLim.PreviewWindow,
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

	return &Stack{
		server: server, db: db, cfg: cfg,
		users: users, sessions: sessions, events: events,
		eventSvc: eventSvc, retention: retentionSvc, auth: auth,
		feed: feed, feedRepo: feedRepo, hub: hub,
	}
}
