package validation

import (
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func TeamEventLinkPatch(req dto.UpdateTeamEventLinkRequest) (dto.TeamEventLinkPatch, error) {
	var patch dto.TeamEventLinkPatch
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
