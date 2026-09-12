package postgres

import (
	"errors"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestMapErrorTranslatesNotificationDeleteBlockToAnHonestConflict(t *testing.T) {
	pgErr := &pgconn.PgError{Code: codeForeignKeyViolation, ConstraintName: "notifications_registration_status_id_fkey"}

	mapped := MapError(pgErr)

	if !errors.Is(mapped, models.ErrConflict) {
		t.Fatalf("MapError did not return a conflict, the caller would see a raw database error: %v", mapped)
	}
	var domainErr *models.DomainError
	if !errors.As(mapped, &domainErr) {
		t.Fatalf("MapError did not return a *models.DomainError: %v", mapped)
	}
	if !strings.Contains(domainErr.Message, "notifications") || !strings.Contains(domainErr.Message, "archive") {
		t.Fatalf("the message does not explain the notifications/archive trade-off: %q", domainErr.Message)
	}
}
