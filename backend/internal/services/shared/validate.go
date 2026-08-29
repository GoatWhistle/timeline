package shared

import (
	"errors"
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/locale"
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

func ValidateText(field, value string, minLen, maxLen int) (string, error) {
	trimmed := strings.TrimSpace(value)
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

func ValidateURL(field, value string) (string, error) {
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

func ProfilePatch(req models.UpdateProfileRequest) (models.ProfilePatch, error) {
	var patch models.ProfilePatch
	if req.DisplayName != nil {
		value, err := ValidateText("display_name", *req.DisplayName, 1, 120)
		if err != nil {
			return patch, err
		}
		patch.DisplayName = &value
	}
	if req.PreferredChannel != nil {
		if *req.PreferredChannel == "" {
			patch.ClearPreferredChannel = true
		} else {
			value, err := ParseChannel("preferred_channel", *req.PreferredChannel)
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
			value, err := ValidateText("telegram_username", *req.TelegramUsername, 1, 64)
			if err != nil {
				return patch, err
			}
			patch.TelegramUsername = &value
		}
	}
	if err := profileLinks(req, &patch); err != nil {
		return patch, err
	}
	if req.Locale != nil {
		value, err := ParseLocale("locale", *req.Locale)
		if err != nil {
			return patch, err
		}
		patch.Locale = &value
	}
	if req.Timezone != nil {
		value, err := ParseTimezone("timezone", *req.Timezone)
		if err != nil {
			return patch, err
		}
		patch.Timezone = &value
	}
	return patch, nil
}

func clearableURL(field string, raw *string, target **string, reset *bool) error {
	if raw == nil {
		return nil
	}
	if strings.TrimSpace(*raw) == "" {
		*reset = true
		return nil
	}
	value, err := ValidateURL(field, *raw)
	if err != nil {
		return err
	}
	if utf8.RuneCountInString(value) > 2048 {
		return models.NewValidation("value is too long",
			models.FieldError{Field: field, Message: "at most 2048 characters"})
	}
	*target = &value
	return nil
}

func profileLinks(req models.UpdateProfileRequest, patch *models.ProfilePatch) error {
	if err := clearableURL("avatar_url", req.AvatarURL,
		&patch.AvatarURL, &patch.ClearAvatarURL); err != nil {
		return err
	}
	if err := clearableURL("github_url", req.GithubURL,
		&patch.GithubURL, &patch.ClearGithubURL); err != nil {
		return err
	}
	if err := clearableURL("website_url", req.WebsiteURL,
		&patch.WebsiteURL, &patch.ClearWebsiteURL); err != nil {
		return err
	}
	if req.Bio == nil {
		return nil
	}
	if strings.TrimSpace(*req.Bio) == "" {
		patch.ClearBio = true
		return nil
	}
	value, err := ValidateText("bio", *req.Bio, 1, 2000)
	if err != nil {
		return err
	}
	patch.Bio = &value
	return nil
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
