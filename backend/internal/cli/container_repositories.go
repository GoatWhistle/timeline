package cli

import (
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	pgfinance "github.com/GoatWhistle/timeline/internal/adapters/postgres/finance"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/resourcelink"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/team"
)

func (c *container) wireRepositories() {
	db := c.db
	c.repos.users = identity.NewUsers(db)
	c.repos.profileLinks = identity.NewProfileLinks(db)
	c.repos.sessions = identity.NewSessions(db)
	c.repos.tokens = identity.NewTokens(db)
	c.repos.invites = identity.NewInvites(db)
	c.repos.events = event.NewEvents(db)
	c.repos.stages = event.NewStages(db)
	c.repos.tracks = event.NewTracks(db)
	c.repos.cases = pgfinance.NewCases(db)
	c.repos.participants = participation.NewParticipants(db)
	c.repos.registrations = participation.NewRegistrations(db)
	c.repos.statuses = participation.NewStatuses(db)
	c.repos.rules = participation.NewRules(db)
	c.repos.notifications = notification.NewNotifications(db)
	c.repos.notificationPreferences = notification.NewPreferences(db)
	c.repos.scheduler = notification.NewScheduler(db)
	c.repos.catalog = query.NewCatalog(db)
	c.repos.tasks = personal.NewTasks(db)
	c.repos.notes = personal.NewNotes(db)
	c.repos.artifacts = personal.NewArtifacts(db)
	c.repos.outcomes = personal.NewOutcomes(db)
	c.repos.templates = personal.NewTemplates(db)
	c.repos.history = personal.NewHistory(db)
	c.repos.retros = personal.NewRetrospectives(db)
	c.repos.reminders = personal.NewReminders(db)
	c.repos.links = resourcelink.NewLinks(db)
	c.repos.queries = query.NewTimeline(db)
	c.repos.digests = query.NewDigests(db)
	c.repos.feed = systemevent.NewEvents(db)
	c.repos.teams = team.NewTeams(db)
	c.repos.teamMembers = team.NewMembers(db)
	c.repos.teamEntries = team.NewEntries(db)
	c.repos.teamRosters = team.NewRosters(db)
	c.repos.teamLinks = team.NewJoinLinks(db)
	c.repos.teamEventLinks = team.NewEventLinks(db)
	c.repos.audit = audit.NewAudit(db)
}
