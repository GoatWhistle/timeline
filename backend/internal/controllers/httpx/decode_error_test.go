package httpx

import (
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type window struct {
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

func decodeBody(t *testing.T, body string) error {
	t.Helper()
	r, err := http.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	if err != nil {
		t.Fatalf("building the request: %v", err)
	}
	var dst window
	return Decode(r, &dst)
}

func onlyField(t *testing.T, err error) models.FieldError {
	t.Helper()
	var domain *models.DomainError
	if !errors.As(err, &domain) {
		t.Fatalf("expected a domain error, got %v", err)
	}
	if !errors.Is(err, models.ErrValidation) {
		t.Fatalf("a date that cannot exist was not a validation error: %v", err)
	}
	if len(domain.Fields) != 1 {
		t.Fatalf("expected exactly one blamed field, got %v", domain.Fields)
	}
	return domain.Fields[0]
}

func TestDecodeBlamesTheFieldHoldingTheImpossibleDay(t *testing.T) {
	cases := []struct {
		name  string
		body  string
		field string
	}{
		{"the thirty-first of February", `{"start_at":"2026-02-31T10:00:00Z"}`, "start_at"},
		{"the thirtieth of February", `{"start_at":"2026-02-30T10:00:00Z"}`, "start_at"},
		{"the thirty-first of April", `{"end_at":"2026-04-31T10:00:00Z"}`, "end_at"},
		{"a leap day in a common year", `{"end_at":"2027-02-29T10:00:00Z"}`, "end_at"},
		{"a thirteenth month", `{"start_at":"2026-13-01T10:00:00Z"}`, "start_at"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			field := onlyField(t, decodeBody(t, tc.body))
			if field.Field != tc.field {
				t.Fatalf("blamed %q, want %q", field.Field, tc.field)
			}
			if field.Code != models.FieldCodeOutOfRange {
				t.Fatalf("code = %q, want %q", field.Code, models.FieldCodeOutOfRange)
			}
		})
	}
}

func TestDecodeBlamesTheSecondFieldWhenOnlyTheSecondIsImpossible(t *testing.T) {
	err := decodeBody(t, `{"start_at":"2026-05-01T10:00:00Z","end_at":"2026-06-31T10:00:00Z"}`)

	field := onlyField(t, err)
	if field.Field != "end_at" {
		t.Fatalf("blamed %q, want end_at", field.Field)
	}
}

func TestDecodeCallsUnreadableTextAFormatProblemRatherThanARange(t *testing.T) {
	field := onlyField(t, decodeBody(t, `{"start_at":"tomorrow"}`))

	if field.Field != "start_at" {
		t.Fatalf("blamed %q, want start_at", field.Field)
	}
	if field.Code != models.FieldCodeInvalidFormat {
		t.Fatalf("code = %q, want %q", field.Code, models.FieldCodeInvalidFormat)
	}
}

func TestDecodeKeepsTheGoParserOutOfTheAnswer(t *testing.T) {
	err := decodeBody(t, `{"start_at":"2026-02-31T10:00:00Z"}`)

	if strings.Contains(err.Error(), "parsing time") {
		t.Fatalf("the Go parser leaked into the message: %v", err)
	}
}

func TestDecodeAcceptsADateThatExists(t *testing.T) {
	if err := decodeBody(t, `{"start_at":"2028-02-29T10:00:00Z"}`); err != nil {
		t.Fatalf("the leap day of a leap year was refused: %v", err)
	}
}
