package systemevent

import (
	"errors"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

var mapError = postgres.MapError

func isNotFound(err error) bool { return errors.Is(err, models.ErrNotFound) }
