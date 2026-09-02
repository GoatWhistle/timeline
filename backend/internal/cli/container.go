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
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/team"
	"github.com/GoatWhistle/timeline/internal/adapters/ratelimit"
	"github.com/GoatWhistle/timeline/internal/adapters/telegram"
	"github.com/GoatWhistle/timeline/internal/config"
	svcauth "github.com/GoatWhistle/timeline/internal/services/auth"
	svccover "github.com/GoatWhistle/timeline/internal/services/cover"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
	svcdigest "github.com/GoatWhistle/timeline/internal/services/digest"
	svcevent "github.com/GoatWhistle/timeline/internal/services/event"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcparticipation "github.com/GoatWhistle/timeline/internal/services/participation"
	svcpersonal "github.com/GoatWhistle/timeline/internal/services/personal"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
	svcreminder "github.com/GoatWhistle/timeline/internal/services/reminder"
	svcscheduler "github.com/GoatWhistle/timeline/internal/services/scheduler"
	sharedaudit "github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
)

type container struct {
	cfg *config.Config
	db  *postgres.DB

	repos struct {
		users         *identity.Users
		profileLinks  *identity.ProfileLinks
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
		retros        *personal.Retrospectives
		reminders     *personal.Reminders
		links         *resourcelink.Links
		userLinks     *resourcelink.PersonalLinks
		queries       *query.Timeline
		digests       *query.Digests
		feed          *systemevent.Events
		calendarFeeds *identity.CalendarFeeds
		teams         *team.Teams
		teamMembers   *team.Members
		teamEntries   *team.Entries
		teamRosters   *team.Rosters
		teamLinks     *team.JoinLinks
		audit         *audit.Audit
	}

	telegram telegram.Sender
	email    email.Sender
	hasher   *crypto.PasswordHasher
	limiter  *ratelimit.Limiter

	auth          *svcauth.AuthService
	invites       *svcauth.InviteService
	profile       *svcauth.ProfileService
	profileLinks  *svcauth.ProfileLinkService
	avatars       *svcauth.AvatarService
	covers        *svccover.Service
	users         *svcauth.UserService
	events        *svcevent.EventService
	catalog       *svcevent.CatalogService
	stages        *svcevent.StageService
	participants  *svcparticipation.ParticipantService
	registrations *svcparticipation.RegistrationService
	statuses      *svcparticipation.StatusService
	rules         *svcparticipation.RuleService
	queries       *svcevent.QueryService
	audit         *sharedaudit.AuditService
	personal      *svcpersonal.PersonalService
	links         *svcevent.ResourceLinkService
	notifier      *svcnotification.NotificationService
	scheduler     *svcscheduler.SchedulerService
	delivery      *svcdelivery.DeliveryService
	ops           *svcdelivery.OpsService
	feed          *svcrealtime.SystemEventService
	calendar      *svcauth.CalendarFeedService
	reminders     *svcreminder.Service
	digest        *svcdigest.DigestService
	hub           *svcrealtime.RealtimeHub
	teams         *svcteam.TeamService
}

func (c *container) wireRepositories() {
	db := c.db
	c.repos.users = identity.NewUsers(db)
	c.repos.profileLinks = identity.NewProfileLinks(db)
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
	c.repos.retros = personal.NewRetrospectives(db)
	c.repos.reminders = personal.NewReminders(db)
	c.repos.links = resourcelink.NewLinks(db)
	c.repos.userLinks = resourcelink.NewPersonalLinks(db)
	c.repos.queries = query.NewTimeline(db)
	c.repos.digests = query.NewDigests(db)
	c.repos.feed = systemevent.NewEvents(db)
	c.repos.calendarFeeds = identity.NewCalendarFeeds(db)
	c.repos.teams = team.NewTeams(db)
	c.repos.teamMembers = team.NewMembers(db)
	c.repos.teamEntries = team.NewEntries(db)
	c.repos.teamRosters = team.NewRosters(db)
	c.repos.teamLinks = team.NewJoinLinks(db)
	c.repos.audit = audit.NewAudit(db)
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
	c.wireRepositories()

	c.telegram = telegram.New(cfg.Telegram)
	c.email = email.New(cfg.Email)
	c.hasher = crypto.NewPasswordHasher(cfg.Argon)
	c.limiter = ratelimit.New()
	limiter := c.limiter
	issuer := crypto.NewTokenIssuer(cfg.Auth)
	mailer := mail.NewMailer(c.email, cfg.App.PublicURL)
	c.audit = sharedaudit.NewAuditService(c.repos.audit)
	c.notifier = svcnotification.NewNotificationService(c.repos.notifications, cfg)
	c.scheduler = svcscheduler.NewSchedulerService(db, c.repos.scheduler,
		c.repos.rules, c.repos.statuses, c.notifier, cfg)

	c.auth = svcauth.NewAuthService(db, c.repos.users, c.repos.sessions, c.repos.tokens, c.repos.invites,
		c.notifier, c.audit, c.hasher, issuer, mailer, limiter, cfg)
	c.invites = svcauth.NewInviteService(db, c.repos.invites, c.repos.users, c.auth, c.audit, mailer, limiter, cfg)
	c.profile = svcauth.NewProfileService(db, c.repos.users, c.repos.tokens, c.repos.sessions,
		c.notifier, c.audit, c.hasher, mailer, c.telegram, cfg)
	c.profileLinks = svcauth.NewProfileLinkService(db, c.repos.profileLinks)
	if err := c.wireAvatars(cfg); err != nil {
		return nil, err
	}
	c.users = svcauth.NewUserService(db, c.repos.users, c.repos.sessions, c.notifier, c.audit, c.cfg)
	c.events = svcevent.NewEventService(db, c.repos.events, c.repos.registrations,
		c.notifier, c.scheduler, c.audit)
	if err := c.wireCovers(cfg); err != nil {
		return nil, err
	}
	c.stages = svcevent.NewStageService(db, c.repos.stages, c.repos.events, c.repos.participants, c.audit)
	c.wireParticipation(cfg)
	c.catalog = svcevent.NewCatalogService(db, c.repos.catalog, c.repos.events, c.repos.participants,
		c.repos.registrations, c.repos.statuses, c.repos.users, c.notifier, c.audit)
	c.queries = svcevent.NewQueryService(c.repos.queries, c.repos.events, c.repos.stages,
		c.repos.participants, c.repos.registrations, c.repos.statuses)
	c.delivery = svcdelivery.NewDeliveryService(db, c.repos.notifications, c.repos.scheduler, c.repos.users,
		c.repos.rules, c.repos.audit, c.telegram, c.email, cfg)
	c.personal = svcpersonal.NewPersonalService(db, c.repos.tasks, c.repos.notes, c.repos.artifacts,
		c.repos.outcomes, c.repos.bookmarks, c.repos.templates, c.repos.history,
		c.repos.events, c.repos.stages, c.repos.participants, cfg.Personal)
	c.links = svcevent.NewResourceLinkService(db, c.repos.links, c.repos.userLinks,
		c.repos.events, c.repos.stages, c.repos.participants, c.audit, cfg.Links)
	c.ops = svcdelivery.NewOpsService(db, c.repos.scheduler, c.repos.notifications, cfg)
	c.feed = svcrealtime.NewSystemEventService(db, c.repos.feed)
	c.hub = svcrealtime.NewRealtimeHub(c.repos.feed, cfg.Realtime.MaxPerUser)
	c.calendar = svcauth.NewCalendarFeedService(db, c.repos.calendarFeeds, c.repos.users,
		c.repos.queries, c.audit, cfg.App.PublicURL)
	c.wireTeams(cfg)
	c.wireRealtime()
	return c, nil
}

func (c *container) wireParticipation(cfg *config.Config) {
	db := c.db
	c.participants = svcparticipation.NewParticipantService(db, c.repos.participants, c.repos.events,
		c.repos.registrations, c.repos.statuses, c.repos.users, c.notifier, c.audit)
	c.registrations = svcparticipation.NewRegistrationService(db, c.repos.registrations, c.repos.events,
		c.repos.participants, c.repos.statuses, c.repos.users, c.notifier, c.scheduler, c.audit)
	c.statuses = svcparticipation.NewStatusService(db, c.repos.statuses, c.repos.registrations,
		c.repos.participants, c.repos.events, c.repos.users, c.notifier, c.scheduler, c.audit)
	c.rules = svcparticipation.NewRuleService(db, c.repos.rules, c.repos.events, c.repos.registrations,
		c.notifier, c.scheduler, c.audit, cfg)
}

func (c *container) wireTeams(cfg *config.Config) {
	c.teams = svcteam.NewTeamService(c.db, c.repos.teams, c.repos.teamMembers,
		c.repos.teamEntries, c.repos.teamRosters, c.repos.teamLinks,
		c.repos.events, c.repos.participants, c.repos.registrations, c.repos.statuses,
		c.repos.users, c.notifier, c.audit, cfg)
}

func (c *container) wireRealtime() {
	c.delivery.WithEvents(c.feed)
	c.personal.WithRetrospectives(c.repos.retros)
	c.reminders = svcreminder.New(c.repos.reminders, c.feed, c.cfg.Personal)
	c.digest = svcdigest.NewDigestService(c.repos.digests, c.feed, c.cfg.Digest, c.cfg.App)
	c.auth.WithRealtime(c.hub)
	c.users.WithRealtime(c.hub)
	c.profile.WithRealtime(c.hub)
	c.users.WithAvatars(c.avatars)
	c.profile.WithAvatars(c.avatars)
	c.users.WithCalendarFeeds(c.repos.calendarFeeds)
	c.profile.WithCalendarFeeds(c.repos.calendarFeeds)
}

func (c *container) Close() { c.db.Close() }
