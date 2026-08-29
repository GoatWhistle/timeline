package participation

import (
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
)

func notFoundRegistration(err error) error {
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound("event registration is not configured")
	}
	return err
}
