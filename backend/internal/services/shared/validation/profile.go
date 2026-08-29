package validation

import (
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
)

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
