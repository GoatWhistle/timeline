package event

import (
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

const teamSizeMaxLimit = 100

type prizeAmount struct {
	pool     *string
	currency *string
}

func normalizeTrack(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	track := strings.TrimSpace(*value)
	if track == "" {
		return nil, nil
	}
	normalized, err := validation.ValidateText("track", track, 1, 120)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func validateTeamSizeBound(field string, value *int) error {
	if value == nil {
		return nil
	}
	if *value < 1 || *value > teamSizeMaxLimit {
		return models.NewValidation("invalid team size",
			models.FieldError{Field: field,
				Message: "must be between 1 and " + strconv.Itoa(teamSizeMaxLimit)})
	}
	return nil
}

func coalesceSize(requested, current *int) *int {
	if requested != nil {
		return requested
	}
	return current
}

func validateTeamSize(minimum, maximum *int) error {
	if err := validateTeamSizeBound("team_size_min", minimum); err != nil {
		return err
	}
	if err := validateTeamSizeBound("team_size_max", maximum); err != nil {
		return err
	}
	if minimum != nil && maximum != nil && *minimum > *maximum {
		return models.NewValidation("the minimum team size exceeds the maximum",
			models.FieldError{Field: "team_size_min",
				Message: "must not be greater than team_size_max"})
	}
	return nil
}

func normalizePrizePool(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	pool := strings.TrimSpace(*value)
	if pool == "" {
		return nil, nil
	}
	amount, err := strconv.ParseFloat(pool, 64)
	if err != nil || amount < 0 {
		return nil, models.NewValidation("invalid prize pool",
			models.FieldError{Field: "prize_pool", Message: "a non-negative decimal number is expected"})
	}
	return &pool, nil
}

func normalizePrizeCurrency(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	code := strings.ToUpper(strings.TrimSpace(*value))
	if code == "" {
		return nil, nil
	}
	if len(code) != 3 {
		return nil, currencyError()
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return nil, currencyError()
		}
	}
	return &code, nil
}

func currencyError() error {
	return models.NewValidation("invalid prize currency",
		models.FieldError{Field: "prize_currency", Message: "ISO 4217 alpha-3, three letters"})
}

func resolvePrize(pool, currency *string, current prizeAmount) (prizeAmount, error) {
	out := current
	if pool != nil {
		amount, err := normalizePrizePool(pool)
		if err != nil {
			return out, err
		}
		out.pool = amount
	}
	if currency != nil {
		code, err := normalizePrizeCurrency(currency)
		if err != nil {
			return out, err
		}
		out.currency = code
	}
	if (out.pool == nil) != (out.currency == nil) {
		return out, models.NewValidation("a prize pool requires a currency",
			models.FieldError{Field: "prize_currency",
				Message: "prize_pool and prize_currency are set and cleared together"})
	}
	return out, nil
}
