package validation

import (
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func ParseChannel(field, value string) (models.Channel, error) {
	channel := models.Channel(strings.ToUpper(strings.TrimSpace(value)))
	if !channel.Valid() {
		return "", models.NewValidation("invalid delivery channel",
			models.FieldError{Field: field, Message: "allowed values are TELEGRAM and EMAIL"})
	}
	return channel, nil
}

func ParseLocale(field, value string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if !locale.Has(normalized) {
		return "", models.NewValidation("unsupported interface language",
			models.FieldError{Field: field, Message: "allowed values are " + strings.Join(locale.Supported(), " and ")})
	}
	return normalized, nil
}

func ParseTimezone(field, value string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" || len(normalized) > 64 {
		return "", models.NewValidation("unsupported time zone",
			models.FieldError{Field: field, Message: "an IANA time zone identifier is required"})
	}
	if _, err := time.LoadLocation(normalized); err != nil {
		return "", models.NewValidation("unsupported time zone",
			models.FieldError{Field: field, Message: "an IANA time zone identifier is required"})
	}
	return normalized, nil
}
