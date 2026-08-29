package services

import (
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validateEmail(field, value string) (string, error) {
	normalized := normalizeEmail(value)
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

func validatePassword(value string, minLength int) error {
	if utf8.RuneCountInString(value) < minLength {
		return models.NewValidation("password is too short",
			models.FieldError{Field: "password", Message: "at least " + itoa(minLength) + " characters"})
	}
	if len(value) > 512 {
		return models.NewValidation("password is too long",
			models.FieldError{Field: "password", Message: "at most 512 characters"})
	}
	return nil
}

func validateText(field, value string, minLen, maxLen int) (string, error) {
	trimmed := strings.TrimSpace(value)
	length := utf8.RuneCountInString(trimmed)
	if length < minLen {
		return "", models.NewValidation("field is required",
			models.FieldError{Field: field, Message: "at least " + itoa(minLen) + " characters"})
	}
	if length > maxLen {
		return "", models.NewValidation("value is too long",
			models.FieldError{Field: field, Message: "at most " + itoa(maxLen) + " characters"})
	}
	return trimmed, nil
}

func validateURL(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return "", models.NewValidation("the link is not a valid URL",
			models.FieldError{Field: field, Message: "an absolute URL is required"})
	}
	switch strings.ToLower(parsed.Scheme) {
	case "javascript", "data", "vbscript", "file":
		return "", models.NewValidation("the link scheme is not allowed",
			models.FieldError{Field: field, Message: "this scheme executes in the browser and is rejected"})
	case "":
		return "", models.NewValidation("the link is not a valid URL",
			models.FieldError{Field: field, Message: "an absolute URL is required"})
	}
	return trimmed, nil
}

func parseChannel(field, value string) (models.Channel, error) {
	channel := models.Channel(strings.ToUpper(strings.TrimSpace(value)))
	if !channel.Valid() {
		return "", models.NewValidation("invalid delivery channel",
			models.FieldError{Field: field, Message: "allowed values are TELEGRAM and EMAIL"})
	}
	return channel, nil
}

func parseLocale(field, value string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if !locale.Has(normalized) {
		return "", models.NewValidation("unsupported interface language",
			models.FieldError{Field: field, Message: "allowed values are " + strings.Join(locale.Supported(), " and ")})
	}
	return normalized, nil
}

func parseTimezone(field, value string) (string, error) {
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

func profilePatch(req models.UpdateProfileRequest) (models.ProfilePatch, error) {
	var patch models.ProfilePatch
	if req.DisplayName != nil {
		value, err := validateText("display_name", *req.DisplayName, 1, 120)
		if err != nil {
			return patch, err
		}
		patch.DisplayName = &value
	}
	if req.PreferredChannel != nil {
		if *req.PreferredChannel == "" {
			patch.ClearPreferredChannel = true
		} else {
			value, err := parseChannel("preferred_channel", *req.PreferredChannel)
			if err != nil {
				return patch, err
			}
			patch.PreferredChannel = &value
		}
	}
	if req.TelegramUsername != nil {
		if *req.TelegramUsername == "" {
			patch.ClearTelegramUsername = true
		} else {
			value, err := validateText("telegram_username", *req.TelegramUsername, 1, 64)
			if err != nil {
				return patch, err
			}
			patch.TelegramUsername = &value
		}
	}
	if req.Locale != nil {
		value, err := parseLocale("locale", *req.Locale)
		if err != nil {
			return patch, err
		}
		patch.Locale = &value
	}
	if req.Timezone != nil {
		value, err := parseTimezone("timezone", *req.Timezone)
		if err != nil {
			return patch, err
		}
		patch.Timezone = &value
	}
	return patch, nil
}

func itoa(n int) string { return strconv.Itoa(n) }
