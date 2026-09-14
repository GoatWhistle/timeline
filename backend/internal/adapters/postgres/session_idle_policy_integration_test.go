//go:build integration

package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestSessionIdleDaysIsBoundedByTheDatabase(t *testing.T) {
	db := testsupport.DB(t)
	ctx := context.Background()
	user := sweepUser(t, db, nil)

	for _, days := range []int{0, -1, 366, 4000} {
		_, err := db.Q(ctx).Exec(ctx,
			`UPDATE users SET session_idle_days = $2 WHERE id = $1`, user.ID, days)
		requireConstraint(t, err, "users_session_idle_days_range")
	}
	for _, days := range []int{1, models.SessionIdleDaysDefault, 365} {
		if _, err := db.Q(ctx).Exec(ctx,
			`UPDATE users SET session_idle_days = $2 WHERE id = $1`, user.ID, days); err != nil {
			t.Fatalf("%d days is inside the range but the database refused it: %v", days, err)
		}
	}
}

func TestNewAccountsStartAtTheDefaultIdlePeriod(t *testing.T) {
	db := testsupport.DB(t)
	ctx := context.Background()
	users := identity.NewUsers(db)

	tag := uuid.NewString()[:8]
	user, err := users.Create(ctx, &models.User{
		FirstName:    "Fresh",
		LastName:     "Account",
		Email:        "fresh-default-" + tag + "@example.test",
		PasswordHash: "hash",
		IsActive:     true,
	})
	if err != nil {
		t.Fatalf("creating the account: %v", err)
	}
	if user.SessionIdleDays == nil {
		t.Fatal("a new account never revokes idle sessions, want the default period")
	}
	if *user.SessionIdleDays != models.SessionIdleDaysDefault {
		t.Fatalf("a new account starts at %d days, want %d",
			*user.SessionIdleDays, models.SessionIdleDaysDefault)
	}
	if models.SessionIdleDaysDefault < models.SessionIdleDaysMin ||
		models.SessionIdleDaysDefault > models.SessionIdleDaysMax {
		t.Fatalf("the default of %d days falls outside the accepted range %d..%d",
			models.SessionIdleDaysDefault, models.SessionIdleDaysMin, models.SessionIdleDaysMax)
	}
}
