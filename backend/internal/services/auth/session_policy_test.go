package auth

import (
	"errors"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestSessionIdleDaysAcceptsAbsence(t *testing.T) {
	if err := validateSessionIdleDays(nil); err != nil {
		t.Fatalf("an absent idle period was refused: %v", err)
	}
}

func TestSessionIdleDaysAcceptsBothBounds(t *testing.T) {
	for _, days := range []int{models.SessionIdleDaysMin, models.SessionIdleDaysMax} {
		value := days
		if err := validateSessionIdleDays(&value); err != nil {
			t.Fatalf("%d days is inside the range but was refused: %v", days, err)
		}
	}
}

func TestSessionIdleDaysRefusesOutsideTheRange(t *testing.T) {
	for _, days := range []int{models.SessionIdleDaysMin - 1, models.SessionIdleDaysMax + 1, 0, -7, 1000} {
		value := days
		err := validateSessionIdleDays(&value)
		if err == nil {
			t.Fatalf("%d days is outside the range but was accepted", days)
		}
		if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("%d days was refused with %v, want a validation error", days, err)
		}
		var domain *models.DomainError
		if !errors.As(err, &domain) {
			t.Fatalf("%d days was refused without a domain error: %v", days, err)
		}
		if len(domain.Fields) != 1 {
			t.Fatalf("%d days named %d fields, want exactly one", days, len(domain.Fields))
		}
		if domain.Fields[0].Field != "idle_days" {
			t.Fatalf("%d days named field %q, want \"idle_days\"", days, domain.Fields[0].Field)
		}
		if domain.Fields[0].Code != models.FieldCodeOutOfRange {
			t.Fatalf("%d days carried code %q, want %q", days, domain.Fields[0].Code, models.FieldCodeOutOfRange)
		}
	}
}
