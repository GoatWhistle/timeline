package event

import (
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	trackPlaceLimit = 20
	trackNoLimit    = 50
)

func parseWholeAmount(field, value string) (int64, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, amountError(field)
	}
	if dot := strings.IndexByte(trimmed, '.'); dot >= 0 {
		fraction := strings.TrimRight(trimmed[dot+1:], "0")
		if fraction != "" {
			return 0, amountError(field)
		}
		trimmed = trimmed[:dot]
	}
	amount, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || amount < 0 {
		return 0, amountError(field)
	}
	return amount, nil
}

func amountError(field string) error {
	return models.NewValidation("invalid prize amount",
		models.FieldError{Field: field, Message: "a non-negative whole number is expected"})
}

func validatePrizeInputs(inputs []dto.TrackPrizeInput) ([]models.TrackPrize, int64, error) {
	prizes := make([]models.TrackPrize, 0, len(inputs))
	seen := make(map[int]struct{}, len(inputs))
	var total int64
	for _, in := range inputs {
		if in.Place < 1 || in.Place > trackPlaceLimit {
			return nil, 0, models.NewValidation("invalid prize place",
				models.FieldError{Field: "place",
					Message: "must be between 1 and " + strconv.Itoa(trackPlaceLimit)})
		}
		if _, duplicate := seen[in.Place]; duplicate {
			return nil, 0, models.NewValidation("duplicate prize place",
				models.FieldError{Field: "place", Message: "each place appears at most once"})
		}
		seen[in.Place] = struct{}{}
		amount, err := parseWholeAmount("amount", in.Amount)
		if err != nil {
			return nil, 0, err
		}
		total += amount
		prizes = append(prizes, models.TrackPrize{
			Place:  in.Place,
			Amount: strconv.FormatInt(amount, 10),
		})
	}
	return prizes, total, nil
}

func checkPoolCoverage(pool *string, others string, candidate int64) error {
	if pool == nil {
		if candidate == 0 {
			return nil
		}
		return models.NewValidation("the event has no prize pool to distribute",
			models.FieldError{Field: "prizes",
				Message: "set prize_pool and prize_currency before distributing prizes"})
	}
	limit, err := parseWholeAmount("prize_pool", *pool)
	if err != nil {
		return err
	}
	existing, err := parseWholeAmount("prizes", others)
	if err != nil {
		return err
	}
	if existing+candidate > limit {
		return models.NewValidation("the distributed prizes exceed the prize pool",
			models.FieldError{Field: "prizes",
				Message: "the sum of every track prize must not exceed prize_pool"})
	}
	return nil
}

func sumPrizes(prizes []models.TrackPrize) string {
	return (&models.EventTrack{Prizes: prizes}).PrizeTotal()
}

func validateTrackNo(value *int) error {
	if value == nil {
		return nil
	}
	if *value < 1 || *value > trackNoLimit {
		return models.NewValidation("invalid track number",
			models.FieldError{Field: "track_no",
				Message: "must be between 1 and " + strconv.Itoa(trackNoLimit)})
	}
	return nil
}
