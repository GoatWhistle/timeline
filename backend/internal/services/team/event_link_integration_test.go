//go:build integration

package team_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type linkFixture struct {
	service  *svcteam.TeamService
	teamID   uuid.UUID
	eventID  uuid.UUID
	lead     uuid.UUID
	member   uuid.UUID
	invited  uuid.UUID
	outsider uuid.UUID
}

func seedLinkUser(t *testing.T, pool *pgxpool.Pool, email, nickname string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash, first_name, last_name, nickname, locale)
		 VALUES ($1, 'x', 'A', 'B', $2, 'en') RETURNING id`, email, nickname).Scan(&id)
	if err != nil {
		t.Fatalf("seeding user %s: %v", email, err)
	}
	return id
}

func newLinkFixture(t *testing.T) linkFixture {
	t.Helper()
	ctx := context.Background()
	pool := testsupport.Pool(t)

	f := linkFixture{
		lead:     seedLinkUser(t, pool, "lead-links@example.com", "leadlinks"),
		member:   seedLinkUser(t, pool, "member-links@example.com", "memberlinks"),
		invited:  seedLinkUser(t, pool, "invited-links@example.com", "invitedlinks"),
		outsider: seedLinkUser(t, pool, "outsider-links@example.com", "outsiderlinks"),
	}

	err := pool.QueryRow(ctx,
		`INSERT INTO teams (name, lead_user_id) VALUES ('Link Team', $1) RETURNING id`,
		f.lead).Scan(&f.teamID)
	if err != nil {
		t.Fatalf("seeding team: %v", err)
	}

	for _, user := range []uuid.UUID{f.lead, f.member} {
		if _, err := pool.Exec(ctx,
			`INSERT INTO team_members (team_id, user_id, state, joined_at)
			 VALUES ($1, $2, 'ACTIVE', now())`, f.teamID, user); err != nil {
			t.Fatalf("seeding an active membership: %v", err)
		}
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state) VALUES ($1, $2, 'INVITED')`,
		f.teamID, f.invited); err != nil {
		t.Fatalf("seeding the invitation: %v", err)
	}

	err = pool.QueryRow(ctx,
		`INSERT INTO events (title, kind, format, origin, start_at, end_at, published_at,
			team_size_min, team_size_max)
		 VALUES ('Link Hack', 'HACKATHON', 'ONLINE', 'RU', now() + interval '1 day',
			now() + interval '2 days', now(), 2, 5)
		 RETURNING id`).Scan(&f.eventID)
	if err != nil {
		t.Fatalf("seeding event: %v", err)
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO team_event_entries (team_id, event_id) VALUES ($1, $2)`,
		f.teamID, f.eventID); err != nil {
		t.Fatalf("seeding entry: %v", err)
	}

	f.service = newService(t, postgres.NewDB(pool))
	return f
}

func (f linkFixture) add(t *testing.T, actor uuid.UUID, url string) *models.TeamEventLink {
	t.Helper()
	link, err := f.service.AddEventLink(context.Background(), models.Actor{UserID: actor},
		f.teamID, f.eventID, dto.CreateTeamEventLinkRequest{URL: url})
	if err != nil {
		t.Fatalf("adding %s: %v", url, err)
	}
	return link
}

func TestTeamEventLinksHiddenFromOutsider(t *testing.T) {
	f := newLinkFixture(t)
	ctx := context.Background()
	f.add(t, f.lead, "https://github.com/team/secret-project")

	_, err := f.service.ListEventLinks(ctx, models.Actor{UserID: f.outsider}, f.teamID, f.eventID)
	if err == nil {
		t.Fatal("an outsider read the team links: the list must not be disclosed")
	}
	if !errors.Is(err, models.ErrNotFound) {
		t.Fatalf("an outsider must get 404 and learn nothing of the entry, got %v", err)
	}
}

func TestTeamEventLinkOutsiderCannotWrite(t *testing.T) {
	f := newLinkFixture(t)
	ctx := context.Background()
	existing := f.add(t, f.lead, "https://github.com/team/project")
	outsider := models.Actor{UserID: f.outsider}

	_, err := f.service.AddEventLink(ctx, outsider, f.teamID, f.eventID,
		dto.CreateTeamEventLinkRequest{URL: "https://evil.example.org/x"})
	if !errors.Is(err, models.ErrNotFound) {
		t.Fatalf("an outsider must not add a team link, got %v", err)
	}
	_, err = f.service.UpdateEventLink(ctx, outsider, existing.ID,
		dto.UpdateTeamEventLinkRequest{URL: linkPtr("https://evil.example.org/y")})
	if !errors.Is(err, models.ErrNotFound) {
		t.Fatalf("an outsider must not edit a team link, got %v", err)
	}
	if err := f.service.RemoveEventLink(ctx, outsider, existing.ID); !errors.Is(
		err, models.ErrNotFound) {
		t.Fatalf("an outsider must not remove a team link, got %v", err)
	}

	after, err := f.service.ListEventLinks(ctx, models.Actor{UserID: f.lead}, f.teamID, f.eventID)
	if err != nil {
		t.Fatalf("listing after refusals: %v", err)
	}
	if len(after.Items) != 1 || after.Items[0].URL != existing.URL {
		t.Fatalf("a refused write must leave the list untouched, got %+v", after.Items)
	}
}

func TestTeamEventLinkAnyActiveMemberMayWrite(t *testing.T) {
	f := newLinkFixture(t)
	ctx := context.Background()
	byLead := f.add(t, f.lead, "https://github.com/team/project")
	f.add(t, f.member, "https://gitlab.com/team/notes")

	_, err := f.service.UpdateEventLink(ctx, models.Actor{UserID: f.member}, byLead.ID,
		dto.UpdateTeamEventLinkRequest{Label: linkPtr("Repository")})
	if err != nil {
		t.Fatalf("an active member must be able to edit a link the lead added: %v", err)
	}

	listed, err := f.service.ListEventLinks(ctx, models.Actor{UserID: f.member}, f.teamID, f.eventID)
	if err != nil {
		t.Fatalf("a member must read the team links: %v", err)
	}
	if len(listed.Items) != 2 {
		t.Fatalf("expected 2 links, got %d", len(listed.Items))
	}
	if !listed.CanWrite {
		t.Fatal("an active member must be reported as able to write")
	}
}

func TestTeamEventLinkInvitedMemberIsReadOnly(t *testing.T) {
	f := newLinkFixture(t)
	ctx := context.Background()
	existing := f.add(t, f.lead, "https://github.com/team/project")
	invited := models.Actor{UserID: f.invited}

	listed, err := f.service.ListEventLinks(ctx, invited, f.teamID, f.eventID)
	if err != nil {
		t.Fatalf("an invited member must still read the team links: %v", err)
	}
	if listed.CanWrite {
		t.Fatal("an unaccepted invitation must not report write access")
	}

	_, err = f.service.AddEventLink(ctx, invited, f.teamID, f.eventID,
		dto.CreateTeamEventLinkRequest{URL: "https://example.org/x"})
	if !errors.Is(err, models.ErrForbidden) {
		t.Fatalf("an unaccepted invitation must be refused with 403, got %v", err)
	}
	_, err = f.service.UpdateEventLink(ctx, invited, existing.ID,
		dto.UpdateTeamEventLinkRequest{URL: linkPtr("https://example.org/y")})
	if !errors.Is(err, models.ErrForbidden) {
		t.Fatalf("an unaccepted invitation must not edit a link, got %v", err)
	}

	after, err := f.service.ListEventLinks(ctx, models.Actor{UserID: f.lead}, f.teamID, f.eventID)
	if err != nil {
		t.Fatalf("listing after refusals: %v", err)
	}
	if len(after.Items) != 1 || after.Items[0].URL != existing.URL {
		t.Fatalf("a refused write must leave the list untouched, got %+v", after.Items)
	}
}

func TestTeamEventLinkRejectsDangerousScheme(t *testing.T) {
	f := newLinkFixture(t)
	ctx := context.Background()
	lead := models.Actor{UserID: f.lead}

	hostBearing := []string{
		"javascript://example.org/%0aalert(1)",
		"ftp://example.org/board",
		"file://example.org/etc/passwd",
		"vbscript://example.org/x",
	}
	for _, raw := range hostBearing {
		_, err := f.service.AddEventLink(ctx, lead, f.teamID, f.eventID,
			dto.CreateTeamEventLinkRequest{URL: raw})
		if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("the scheme of %q must be rejected on the scheme alone, got %v", raw, err)
		}
	}

	for _, raw := range []string{"javascript:alert(1)", "data:text/html,x", "https://"} {
		_, err := f.service.AddEventLink(ctx, lead, f.teamID, f.eventID,
			dto.CreateTeamEventLinkRequest{URL: raw})
		if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("the hostless address %q must be rejected, got %v", raw, err)
		}
	}

	if _, err := f.service.AddEventLink(ctx, lead, f.teamID, f.eventID,
		dto.CreateTeamEventLinkRequest{URL: "http://plain.example.org/board"}); err != nil {
		t.Fatalf("plain http must be accepted: %v", err)
	}
}

func linkPtr[T any](value T) *T { return &value }
