package finance

import (
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
)

const (
	caseNameLimit        = 200
	casePartnerLimit     = 200
	caseDescriptionLimit = 4000
	caseNoLimit          = 200
)

func ParseWholeAmount(field, value string) (int64, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, amountError(field)
	}
	if dot := strings.IndexByte(trimmed, '.'); dot >= 0 {
		fraction := strings.TrimRight(trimmed[dot+1:], "0")
		if fraction != "" {
			return 0, amountError(field)
		}
		trimmed = trimmed[:dot]
	}
	amount, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || amount < 0 {
		return 0, amountError(field)
	}
	return amount, nil
}

func amountError(field string) error {
	return models.NewValidation("invalid prize amount",
		models.FieldError{Field: field, Message: "a non-negative whole number is expected"})
}

func Whole(value string) int64 {
	trimmed := strings.TrimSpace(value)
	if dot := strings.IndexByte(trimmed, '.'); dot >= 0 {
		trimmed = trimmed[:dot]
	}
	amount, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return 0
	}
	return amount
}

func Format(value int64) string { return strconv.FormatInt(value, 10) }

func Pointer(value int64) *string {
	out := Format(value)
	return &out
}

func text(field, raw string, limit int) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" || utf8.RuneCountInString(value) > limit {
		return "", models.NewValidation("invalid "+field,
			models.FieldError{Field: field,
				Message: "1 to " + strconv.Itoa(limit) + " characters are expected"})
	}
	return value, nil
}

func optionalText(field string, raw *string, limit int) (*string, error) {
	if raw == nil {
		return nil, nil
	}
	value := strings.TrimSpace(*raw)
	if value == "" {
		return nil, nil
	}
	if utf8.RuneCountInString(value) > limit {
		return nil, models.NewValidation("invalid "+field,
			models.FieldError{Field: field,
				Message: "at most " + strconv.Itoa(limit) + " characters are expected"})
	}
	return &value, nil
}

func validateCaseNo(value *int) error {
	if value == nil {
		return nil
	}
	if *value < 1 || *value > caseNoLimit {
		return models.NewValidation("invalid case number",
			models.FieldError{Field: "case_no",
				Message: "must be between 1 and " + strconv.Itoa(caseNoLimit)})
	}
	return nil
}
