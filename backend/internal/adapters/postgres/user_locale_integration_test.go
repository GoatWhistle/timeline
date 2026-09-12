//go:build integration

package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestUserLocaleDefaultsToConfiguredDefault(t *testing.T) {
	pool := testsupport.Pool(t)
	id := insertUser(t, pool, "locale-default@example.test")

	var stored string
	if err := pool.QueryRow(context.Background(),
		`SELECT locale FROM users WHERE id = $1`, id).Scan(&stored); err != nil {
		t.Fatalf("reading locale: %v", err)
	}
	if stored != locale.Default {
		t.Fatalf("locale = %q, want %q", stored, locale.Default)
	}
}

func TestUserLocaleRejectsUnsupportedValue(t *testing.T) {
	pool := testsupport.Pool(t)
	id := insertUser(t, pool, "locale-invalid@example.test")

	_, err := pool.Exec(context.Background(),
		`UPDATE users SET locale = 'de' WHERE id = $1`, id)
	requireConstraint(t, err, "users_locale_enum")
}

func TestUpdateProfileStoresLocale(t *testing.T) {
	db := testsupport.DB(t)
	users := identity.NewUsers(db)
	ctx := context.Background()

	created, err := users.Create(ctx, &models.User{
		FirstName:    "Test",
		LastName:     "User",
		Email:        "locale-update@example.test",
		PasswordHash: "hash",
		IsActive:     true,
	})
	if err != nil {
		t.Fatalf("creating user: %v", err)
	}
	if created.Locale != locale.Default {
		t.Fatalf("new user locale = %q, want %q", created.Locale, locale.Default)
	}

	english := "en"
	updated, err := users.UpdateProfile(ctx, created.ID, dto.ProfilePatch{Locale: &english})
	if err != nil {
		t.Fatalf("updating profile: %v", err)
	}
	if updated.Locale != "en" {
		t.Fatalf("locale after update = %q, want en", updated.Locale)
	}

	name := "Renamed"
	kept, err := users.UpdateProfile(ctx, created.ID, dto.ProfilePatch{FirstName: &name})
	if err != nil {
		t.Fatalf("updating profile without locale: %v", err)
	}
	if kept.Locale != "en" {
		t.Fatalf("locale was reset to %q by an unrelated patch", kept.Locale)
	}

	reread, err := users.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("re-reading user: %v", err)
	}
	if reread.Locale != "en" {
		t.Fatalf("stored locale = %q, want en", reread.Locale)
	}
	if reread.ID == uuid.Nil {
		t.Fatal("user identifier is empty")
	}
}

func TestNotificationPayloadKeepsLanguageAfterLocaleChange(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	if _, err := pool.Exec(ctx, `UPDATE users SET locale = 'en' WHERE id = $1`, userID); err != nil {
		t.Fatalf("setting the recipient locale: %v", err)
	}

	db := postgres.NewDB(pool)
	notifications := notification.NewNotifications(db)
	status := uuid.MustParse(statusID)
	recipient := uuid.MustParse(userID)
	scheduled := time.Now().UTC().Truncate(time.Second)
	version := 1

	created, _, err := notifications.Insert(ctx, &models.Notification{
		NotificationType:           models.NotificationRequired,
		RecipientUserID:            recipient,
		RegistrationStatusID:       &status,
		AssignmentVersion:          &version,
		ActivationVersion:          &version,
		NotificationContentVersion: 1,
		LogicalKey:                 "locale-snapshot-" + statusID,
		RequestedChannel:           models.ChannelEmail,
		ScheduledAt:                scheduled,
		NextAttemptAt:              &scheduled,
		Payload: &models.NotificationPayload{
			EventTitle: "Demo Day",
			Type:       string(models.NotificationRequired),
			Language:   "en",
			Subject:    locale.Message("en", "notification.primary.subject", "title", "Demo Day"),
			Body:       locale.Message("en", "notification.primary.body", "title", "Demo Day"),
		},
	})
	if err != nil {
		t.Fatalf("creating notification: %v", err)
	}

	if _, err := pool.Exec(ctx, `UPDATE users SET locale = 'ru' WHERE id = $1`, userID); err != nil {
		t.Fatalf("changing the recipient locale: %v", err)
	}

	stored, err := notifications.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("re-reading notification: %v", err)
	}
	if stored.Payload == nil {
		t.Fatal("the payload snapshot is missing")
	}
	if stored.Payload.Language != "en" {
		t.Fatalf("snapshot language = %q, want en", stored.Payload.Language)
	}
	if stored.Payload.Subject != locale.Message("en", "notification.primary.subject", "title", "Demo Day") {
		t.Fatalf("snapshot subject was rewritten: %q", stored.Payload.Subject)
	}
	if stored.Payload.Subject == locale.Message("ru", "notification.primary.subject", "title", "Demo Day") {
		t.Fatal("the two languages produced the same subject; the test proves nothing")
	}
}
