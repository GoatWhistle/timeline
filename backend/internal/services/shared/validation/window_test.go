package validation_test

import (
	"errors"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func fieldNames(t *testing.T, err error) []string {
	t.Helper()
	var domain *models.DomainError
	if !errors.As(err, &domain) {
		t.Fatalf("expected a domain error, got %v", err)
	}
	names := make([]string, 0, len(domain.Fields))
	for _, field := range domain.Fields {
		names = append(names, field.Field)
	}
	return names
}

func fieldCode(t *testing.T, err error, name string) string {
	t.Helper()
	var domain *models.DomainError
	if !errors.As(err, &domain) {
		t.Fatalf("expected a domain error, got %v", err)
	}
	for _, field := range domain.Fields {
		if field.Field == name {
			return field.Code
		}
	}
	t.Fatalf("no complaint about %q, got %v", name, fieldNames(t, err))
	return ""
}

func equal(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("fields = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("fields = %v, want %v", got, want)
		}
	}
}

func TestWindowBlamesTheStartWhenOnlyTheStartIsMissing(t *testing.T) {
	end := time.Date(2026, 5, 3, 18, 0, 0, 0, time.UTC)
	err := validation.Window{End: end, Subject: "event"}.Validate()

	equal(t, fieldNames(t, err), []string{"start_at"})
	if code := fieldCode(t, err, "start_at"); code != models.FieldCodeRequired {
		t.Fatalf("start_at code = %q, want %q", code, models.FieldCodeRequired)
	}
}

func TestWindowBlamesTheEndWhenOnlyTheEndIsMissing(t *testing.T) {
	start := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	err := validation.Window{Start: start, Subject: "event"}.Validate()

	equal(t, fieldNames(t, err), []string{"end_at"})
	if code := fieldCode(t, err, "end_at"); code != models.FieldCodeRequired {
		t.Fatalf("end_at code = %q, want %q", code, models.FieldCodeRequired)
	}
}

func TestWindowBlamesBothWhenBothAreMissing(t *testing.T) {
	err := validation.Window{Subject: "event"}.Validate()

	equal(t, fieldNames(t, err), []string{"start_at", "end_at"})
}

func TestWindowBlamesTheEndWhenItPrecedesAFilledStart(t *testing.T) {
	start := time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	err := validation.Window{Start: start, End: end, Subject: "event"}.Validate()

	equal(t, fieldNames(t, err), []string{"end_at"})
	if code := fieldCode(t, err, "end_at"); code != models.FieldCodeEndBeforeStart {
		t.Fatalf("end_at code = %q, want %q", code, models.FieldCodeEndBeforeStart)
	}
}

func TestWindowRefusesAnEndEqualToTheStart(t *testing.T) {
	moment := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	err := validation.Window{Start: moment, End: moment, Subject: "event"}.Validate()

	equal(t, fieldNames(t, err), []string{"end_at"})
}

func TestWindowAcceptsAnEndAfterTheStart(t *testing.T) {
	start := time.Date(2026, 5, 1, 10, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 3, 18, 0, 0, 0, time.UTC)
	if err := (validation.Window{Start: start, End: end, Subject: "event"}).Validate(); err != nil {
		t.Fatalf("a well-formed window was refused: %v", err)
	}
}
