package validation

import (
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

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
