package validation

import (
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func ProfilePatch(req dto.UpdateProfileRequest) (dto.ProfilePatch, error) {
	var patch dto.ProfilePatch
	if err := profileName(req, &patch); err != nil {
		return patch, err
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

func profileLinks(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if err := clearableURL("avatar_url", req.AvatarURL,
		&patch.AvatarURL, &patch.ClearAvatarURL); err != nil {
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

func profileName(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.FirstName != nil {
		value, err := ValidateText("first_name", *req.FirstName, models.NameMinLen, models.NameMaxLen)
		if err != nil {
			return err
		}
		patch.FirstName = &value
	}
	if req.LastName != nil {
		value, err := ValidateText("last_name", *req.LastName, models.NameMinLen, models.NameMaxLen)
		if err != nil {
			return err
		}
		patch.LastName = &value
	}
	if req.MiddleName != nil {
		if strings.TrimSpace(*req.MiddleName) == "" {
			patch.ClearMiddleName = true
		} else {
			value, err := ValidateText("middle_name", *req.MiddleName, models.NameMinLen, models.NameMaxLen)
			if err != nil {
				return err
			}
			patch.MiddleName = &value
		}
	}
	patch.ProfilePublic = req.ProfilePublic
	return profileNickname(req, patch)
}

func profileNickname(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.Nickname == nil {
		return nil
	}
	value := strings.TrimSpace(*req.Nickname)
	if value == "" {
		patch.ClearNickname = true
		return nil
	}
	if !models.NicknameFormatValid(value) {
		return models.NewValidation("invalid nickname",
			models.FieldError{Field: "nickname", Message: "3 to 39 latin letters, digits, hyphen or underscore"})
	}
	if models.NicknameReserved(value) {
		return models.NewValidation("nickname is reserved",
			models.FieldError{Field: "nickname", Message: "this nickname is reserved"})
	}
	patch.Nickname = &value
	return nil
}

func PersonName(firstField, lastField, first string, middle *string, last string) (string, *string, string, error) {
	firstValue, err := ValidateText(firstField, first, models.NameMinLen, models.NameMaxLen)
	if err != nil {
		return "", nil, "", err
	}
	lastValue, err := ValidateText(lastField, last, models.NameMinLen, models.NameMaxLen)
	if err != nil {
		return "", nil, "", err
	}
	if middle == nil || strings.TrimSpace(*middle) == "" {
		return firstValue, nil, lastValue, nil
	}
	middleValue, err := ValidateText("middle_name", *middle, models.NameMinLen, models.NameMaxLen)
	if err != nil {
		return "", nil, "", err
	}
	return firstValue, &middleValue, lastValue, nil
}

func ProfileLinkURL(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", models.NewValidation("the link is empty",
			models.FieldError{Field: field, Message: "an absolute URL is required"})
	}
	if utf8.RuneCountInString(trimmed) > 2048 {
		return "", models.NewValidation("value is too long",
			models.FieldError{Field: field, Message: "at most 2048 characters"})
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return "", models.NewValidation("the link is not a valid URL",
			models.FieldError{Field: field, Message: "an absolute URL is required"})
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return trimmed, nil
	}
	return "", models.NewValidation("the link scheme is not allowed",
		models.FieldError{Field: field, Message: "only http and https links are accepted"})
}

func ProfileLinkLabel(raw *string) (*string, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	value, err := ValidateText("label", *raw, 1, 100)
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func ProfileLinkPatch(req dto.UpdateProfileLinkRequest) (dto.ProfileLinkPatch, error) {
	var patch dto.ProfileLinkPatch
	if req.URL != nil {
		value, err := ProfileLinkURL("url", *req.URL)
		if err != nil {
			return patch, err
		}
		patch.URL = &value
	}
	if req.ClearLabel {
		patch.LabelSet = true
		return patch, nil
	}
	if req.Label != nil {
		value, err := ProfileLinkLabel(req.Label)
		if err != nil {
			return patch, err
		}
		patch.LabelSet = true
		patch.Label = value
	}
	return patch, nil
}
