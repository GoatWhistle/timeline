package services

import (
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

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

func validateHTTPS(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", models.NewValidation("the link must start with https://",
			models.FieldError{Field: field, Message: "an absolute HTTPS URL is required"})
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

func itoa(n int) string { return strconv.Itoa(n) }
