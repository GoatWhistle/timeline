package httpx

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func decodeError(body []byte, err error) error {
	var parse *time.ParseError
	if !errors.As(err, &parse) {
		return models.NewValidationf("malformed JSON: %v", err)
	}
	field := fieldHolding(body, parse.Value)
	if field == "" {
		return models.NewValidation("the value is not a valid moment in time")
	}
	return models.NewValidation("the value is not a valid moment in time",
		models.FieldError{Field: field, Code: timeFieldCode(parse),
			Message: "not a valid date and time"})
}

func timeFieldCode(parse *time.ParseError) string {
	switch parse.Message {
	case ": day out of range", ": month out of range":
		return models.FieldCodeOutOfRange
	}
	return models.FieldCodeInvalidFormat
}

func fieldHolding(body []byte, value string) string {
	var raw map[string]json.RawMessage
	if json.Unmarshal(body, &raw) != nil {
		return ""
	}
	for name, encoded := range raw {
		var text string
		if json.Unmarshal(encoded, &text) == nil && text == value {
			return name
		}
	}
	return ""
}
