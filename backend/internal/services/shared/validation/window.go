package validation

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

const (
	FieldStartAt = "start_at"
	FieldEndAt   = "end_at"
)

type Window struct {
	Start   time.Time
	End     time.Time
	Subject string
}

func (w Window) startMissing() bool { return w.Start.IsZero() }

func (w Window) endMissing() bool { return w.End.IsZero() }

func (w Window) Validate() error {
	switch {
	case w.startMissing() && w.endMissing():
		return models.NewValidation("the "+w.Subject+" needs a start and an end",
			models.FieldError{Field: FieldStartAt, Code: models.FieldCodeRequired,
				Message: "required field"},
			models.FieldError{Field: FieldEndAt, Code: models.FieldCodeRequired,
				Message: "required field"})
	case w.startMissing():
		return models.NewValidation("the "+w.Subject+" needs a start",
			models.FieldError{Field: FieldStartAt, Code: models.FieldCodeRequired,
				Message: "required field"})
	case w.endMissing():
		return models.NewValidation("the "+w.Subject+" needs an end",
			models.FieldError{Field: FieldEndAt, Code: models.FieldCodeRequired,
				Message: "required field"})
	case !w.End.After(w.Start):
		return models.NewValidation(w.Subject+" end must be later than its start",
			models.FieldError{Field: FieldEndAt, Code: models.FieldCodeEndBeforeStart,
				Message: "must be later than start_at"})
	}
	return nil
}
