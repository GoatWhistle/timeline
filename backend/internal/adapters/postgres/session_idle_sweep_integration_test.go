//go:build integration

package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func sweepUser(t *testing.T, db *postgres.DB, idleDays *int) *models.User {
	t.Helper()
	users := identity.NewUsers(db)
	ctx := context.Background()
	tag := uuid.NewString()[:8]
	user, err := users.Create(ctx, &models.User{
		FirstName:    "Idle",
		LastName:     "Sweep",
		Email:        "idle-sweep-" + tag + "@example.test",
		PasswordHash: "hash",
		IsActive:     true,
	})
	if err != nil {
		t.Fatalf("creating the account: %v", err)
	}
	if _, err := users.SetSessionIdleDays(ctx, user.ID, idleDays); err != nil {
		t.Fatalf("storing the idle policy: %v", err)
	}
	return user
}

func sweepSession(t *testing.T, db *postgres.DB, userID uuid.UUID, lastUsedAt time.Time) *models.Session {
	t.Helper()
	sessions := identity.NewSessions(db)
	ctx := context.Background()
	now := time.Now().UTC()
	session, err := sessions.Create(ctx, &models.Session{
		UserID:           userID,
		FamilyID:         uuid.New(),
		RefreshTokenHash: uuid.NewString(),
		ExpiresAt:        now.Add(30 * 24 * time.Hour),
		LastUsedAt:       &lastUsedAt,
	})
	if err != nil {
		t.Fatalf("creating the session: %v", err)
	}
	return session
}

func revokedAt(t *testing.T, db *postgres.DB, id uuid.UUID) *time.Time {
	t.Helper()
	session, err := identity.NewSessions(db).GetByID(context.Background(), id)
	if err != nil {
		t.Fatalf("reading the session back: %v", err)
	}
	return session.RevokedAt
}

func TestIdleSweepSparesTheMostRecentlyUsedSession(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	now := time.Now().UTC()
	days := 30
	user := sweepUser(t, db, &days)

	current := sweepSession(t, db, user.ID, now.Add(-90*24*time.Hour))
	older := sweepSession(t, db, user.ID, now.Add(-120*24*time.Hour))

	revoked, err := sessions.RevokeIdle(context.Background(), now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("the sweep revoked %d sessions, want 1", revoked)
	}
	if revokedAt(t, db, current.ID) != nil {
		t.Fatalf("the most recently used session was revoked, leaving the account no way back in")
	}
	if revokedAt(t, db, older.ID) == nil {
		t.Fatalf("the older idle session survived the sweep")
	}
}

func TestIdleSweepSparesASoleSessionHoweverStale(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	now := time.Now().UTC()
	days := 1
	user := sweepUser(t, db, &days)

	only := sweepSession(t, db, user.ID, now.Add(-365*24*time.Hour))

	revoked, err := sessions.RevokeIdle(context.Background(), now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 0 {
		t.Fatalf("the sweep revoked %d sessions, want 0", revoked)
	}
	if revokedAt(t, db, only.ID) != nil {
		t.Fatalf("the only session was revoked, signing the account out of everything")
	}
}

func TestIdleSweepActsOnlyOnceTheFullPeriodHasPassed(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	now := time.Now().UTC()
	days := 10
	user := sweepUser(t, db, &days)

	sweepSession(t, db, user.ID, now)
	justInside := sweepSession(t, db, user.ID, now.Add(-10*24*time.Hour).Add(time.Hour))
	exactly := sweepSession(t, db, user.ID, now.Add(-10*24*time.Hour))

	revoked, err := sessions.RevokeIdle(context.Background(), now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("the sweep revoked %d sessions, want 1", revoked)
	}
	if revokedAt(t, db, justInside.ID) != nil {
		t.Fatalf("a session idle for less than the stored period was revoked early")
	}
	if revokedAt(t, db, exactly.ID) == nil {
		t.Fatalf("a session idle for exactly the stored period was left alone")
	}
}

func TestIdleSweepLeavesAccountsThatTurnedItOffAlone(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	now := time.Now().UTC()
	user := sweepUser(t, db, nil)

	fresh := sweepSession(t, db, user.ID, now)
	ancient := sweepSession(t, db, user.ID, now.Add(-400*24*time.Hour))

	revoked, err := sessions.RevokeIdle(context.Background(), now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 0 {
		t.Fatalf("the sweep revoked %d sessions for an account that turned it off, want 0", revoked)
	}
	if revokedAt(t, db, ancient.ID) != nil {
		t.Fatalf("an idle session was revoked although the account turned the sweep off")
	}
	if revokedAt(t, db, fresh.ID) != nil {
		t.Fatalf("a fresh session was revoked although the account turned the sweep off")
	}
}

func TestIdleSweepFallsBackToCreationWhenNeverUsed(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	ctx := context.Background()
	now := time.Now().UTC()
	days := 5
	user := sweepUser(t, db, &days)

	sweepSession(t, db, user.ID, now)
	neverUsed, err := sessions.Create(ctx, &models.Session{
		UserID:           user.ID,
		FamilyID:         uuid.New(),
		RefreshTokenHash: uuid.NewString(),
		ExpiresAt:        now.Add(30 * 24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("creating the never-used session: %v", err)
	}
	if _, err := db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET created_at = $2 WHERE id = $1`, neverUsed.ID,
		now.Add(-30*24*time.Hour)); err != nil {
		t.Fatalf("ageing the never-used session: %v", err)
	}

	revoked, err := sessions.RevokeIdle(ctx, now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("the sweep revoked %d sessions, want 1", revoked)
	}
	if revokedAt(t, db, neverUsed.ID) == nil {
		t.Fatalf("a session never used since creation escaped the sweep")
	}
}

func TestIdleSweepJudgesEachAccountByItsOwnPolicy(t *testing.T) {
	db := testsupport.DB(t)
	sessions := identity.NewSessions(db)
	now := time.Now().UTC()

	strictDays := 7
	strict := sweepUser(t, db, &strictDays)
	sweepSession(t, db, strict.ID, now)
	strictIdle := sweepSession(t, db, strict.ID, now.Add(-30*24*time.Hour))

	lenientDays := 90
	lenient := sweepUser(t, db, &lenientDays)
	sweepSession(t, db, lenient.ID, now)
	lenientIdle := sweepSession(t, db, lenient.ID, now.Add(-30*24*time.Hour))

	revoked, err := sessions.RevokeIdle(context.Background(), now, 100)
	if err != nil {
		t.Fatalf("the sweep failed: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("the sweep revoked %d sessions, want 1", revoked)
	}
	if revokedAt(t, db, strictIdle.ID) == nil {
		t.Fatalf("a session past the owner's own period survived the sweep")
	}
	if revokedAt(t, db, lenientIdle.ID) != nil {
		t.Fatalf("a session was revoked under another account's shorter period")
	}
}
