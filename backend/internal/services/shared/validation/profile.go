package validation

import (
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func ProfilePatch(req dto.UpdateProfileRequest) (dto.ProfilePatch, error) {
	var patch dto.ProfilePatch
	if err := profileName(req, &patch); err != nil {
		return patch, err
	}
	if err := profileChannels(req, &patch); err != nil {
		return patch, err
	}
	if err := profileTelegramUsername(req, &patch); err != nil {
		return patch, err
	}
	if err := profileLinks(req, &patch); err != nil {
		return patch, err
	}
	if err := profileLocale(req, &patch); err != nil {
		return patch, err
	}
	if err := profileAppearance(req, &patch); err != nil {
		return patch, err
	}
	return patch, nil
}

func profileChannels(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.NotificationChannels == nil {
		return nil
	}
	channels := make(models.ChannelSet, 0, len(req.NotificationChannels))
	for _, raw := range req.NotificationChannels {
		value, err := ParseChannel("notification_channels", raw)
		if err != nil {
			return err
		}
		channels = append(channels, value)
	}
	normalized := models.NormalizeChannelSet(channels)
	patch.NotificationChannels = &normalized
	return nil
}

func profileTelegramUsername(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.TelegramUsername == nil {
		return nil
	}
	if *req.TelegramUsername == "" {
		patch.ClearTelegramUsername = true
		return nil
	}
	value, err := ValidateText("telegram_username", *req.TelegramUsername, 1, 64)
	if err != nil {
		return err
	}
	patch.TelegramUsername = &value
	return nil
}

func profileLocale(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.Locale != nil {
		value, err := ParseLocale("locale", *req.Locale)
		if err != nil {
			return err
		}
		patch.Locale = &value
	}
	if req.Timezone != nil {
		value, err := ParseTimezone("timezone", *req.Timezone)
		if err != nil {
			return err
		}
		patch.Timezone = &value
	}
	return nil
}

func profileAppearance(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.ProfileVisibility != nil {
		value := models.ProfileVisibility(*req.ProfileVisibility)
		if !value.Valid() {
			return models.NewValidation("invalid profile visibility",
				models.FieldError{Field: "profile_visibility", Message: "must be public, members or private"})
		}
		patch.ProfileVisibility = &value
	}
	if req.Theme != nil {
		value := models.UserTheme(*req.Theme)
		if !value.Valid() {
			return models.NewValidation("invalid theme",
				models.FieldError{Field: "theme", Message: "must be dark, light or system"})
		}
		patch.Theme = &value
	}
	return nil
}

func profileLinks(req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
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

func RegistrationNickname(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", models.NewValidation("nickname is required",
			models.FieldError{Field: "nickname", Message: "a nickname is required"})
	}
	if !models.NicknameFormatValid(value) {
		return "", models.NewValidation("invalid nickname",
			models.FieldError{Field: "nickname", Message: "3 to 39 latin letters, digits, hyphen or underscore"})
	}
	if models.NicknameReserved(value) {
		return "", models.NewValidation("nickname is reserved",
			models.FieldError{Field: "nickname", Message: "this nickname is reserved"})
	}
	return value, nil
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
