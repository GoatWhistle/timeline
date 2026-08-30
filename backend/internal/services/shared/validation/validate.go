package validation

import (
	"errors"
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
)

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func ValidateEmail(field, value string) (string, error) {
	normalized := NormalizeEmail(value)
	if normalized == "" {
		return "", models.NewValidation("provide an email address",
			models.FieldError{Field: field, Message: "required field"})
	}
	if len(normalized) > 254 {
		return "", models.NewValidation("email is too long",
			models.FieldError{Field: field, Message: "at most 254 characters"})
	}
	if _, err := mail.ParseAddress(normalized); err != nil {
		return "", models.NewValidation("invalid email address",
			models.FieldError{Field: field, Message: "invalid format"})
	}
	return normalized, nil
}

func ValidatePassword(value string, minLength int) error {
	if utf8.RuneCountInString(value) < minLength {
		return models.NewValidation("password is too short",
			models.FieldError{Field: "password", Message: "at least " + Itoa(minLength) + " characters"})
	}
	if len(value) > 512 {
		return models.NewValidation("password is too long",
			models.FieldError{Field: "password", Message: "at most 512 characters"})
	}
	return nil
}

func StripControlChars(value string) string {
	var out strings.Builder
	out.Grow(len(value))
	for _, r := range value {
		switch {
		case r == '\n' || r == '\t':
			out.WriteRune(r)
		case r == '\r':
		case r < 0x20 || r == 0x7f:
		case r >= 0x80 && r <= 0x9f:
		case r == '\u2028' || r == '\u2029':
		default:
			out.WriteRune(r)
		}
	}
	return out.String()
}

func ValidateText(field, value string, minLen, maxLen int) (string, error) {
	trimmed := strings.TrimSpace(StripControlChars(value))
	length := utf8.RuneCountInString(trimmed)
	if length < minLen {
		return "", models.NewValidation("field is required",
			models.FieldError{Field: field, Message: "at least " + Itoa(minLen) + " characters"})
	}
	if length > maxLen {
		return "", models.NewValidation("value is too long",
			models.FieldError{Field: field, Message: "at most " + Itoa(maxLen) + " characters"})
	}
	return trimmed, nil
}

var allowedURLSchemes = map[string]struct{}{
	"http":   {},
	"https":  {},
	"ftp":    {},
	"ftps":   {},
	"tg":     {},
	"matrix": {},
	"webcal": {},
	"irc":    {},
	"ircs":   {},
	"xmpp":   {},
}

func ValidateURL(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return "", models.NewValidation("the link is not a valid URL",
			models.FieldError{Field: field, Message: "an absolute URL is required"})
	}
	if _, ok := allowedURLSchemes[strings.ToLower(parsed.Scheme)]; !ok {
		return "", models.NewValidation("the link scheme is not allowed",
			models.FieldError{Field: field, Message: "this scheme is not on the accepted list"})
	}
	return trimmed, nil
}

func Itoa(n int) string { return strconv.Itoa(n) }

func OptionalURL(field string, value *string) (*string, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	normalized, err := ValidateURL(field, *value)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func OptionalText(field string, value *string, maxLen int) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed, err := ValidateText(field, *value, 1, maxLen)
	if err != nil {
		return nil, err
	}
	return &trimmed, nil
}

func NotFoundOwned(err error, what string) error {
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound(what + " not found")
	}
	return err
}

func ValidateTeamRole(kind models.EventKind, value *string) (*string, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		if kind == models.EventKindMeetup {
			return nil, nil
		}
		return nil, models.NewValidation("a team role is required for a hackathon",
			models.FieldError{Field: "team_role", Message: "required field"})
	}
	role, err := ValidateText("team_role", *value, 1, 80)
	if err != nil {
		return nil, err
	}
	return &role, nil
}
