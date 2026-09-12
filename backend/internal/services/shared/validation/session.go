package validation

import (
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func SessionLabel(raw *string) (*string, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	value, err := ValidateText("label", *raw, 1, models.SessionLabelMaxLength)
	if err != nil {
		return nil, err
	}
	return &value, nil
}

func SessionPatch(req dto.UpdateSessionRequest) (dto.SessionPatch, error) {
	var patch dto.SessionPatch
	if req.ClearLabel {
		patch.LabelSet = true
		return patch, nil
	}
	if req.Label != nil {
		value, err := SessionLabel(req.Label)
		if err != nil {
			return patch, err
		}
		patch.LabelSet = true
		patch.Label = value
	}
	return patch, nil
}
