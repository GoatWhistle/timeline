package event

import (
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	trackPlaceLimit      = 20
	trackNoLimit         = 50
	nominationTitleLimit = 120
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

func validateNominationTitle(raw string, seen map[string]struct{}) (string, error) {
	title := strings.TrimSpace(raw)
	if title == "" || utf8.RuneCountInString(title) > nominationTitleLimit {
		return "", models.NewValidation("invalid nomination title",
			models.FieldError{Field: "title",
				Message: "1 to " + strconv.Itoa(nominationTitleLimit) + " characters are expected"})
	}
	key := strings.ToLower(title)
	if _, duplicate := seen[key]; duplicate {
		return "", models.NewValidation("duplicate nomination title",
			models.FieldError{Field: "title", Message: "each nomination appears at most once"})
	}
	seen[key] = struct{}{}
	return title, nil
}

func validatePlace(place int, seen map[int]struct{}) error {
	if place < 1 || place > trackPlaceLimit {
		return models.NewValidation("invalid prize place",
			models.FieldError{Field: "place",
				Message: "must be between 1 and " + strconv.Itoa(trackPlaceLimit)})
	}
	if _, duplicate := seen[place]; duplicate {
		return models.NewValidation("duplicate prize place",
			models.FieldError{Field: "place", Message: "each place appears at most once"})
	}
	seen[place] = struct{}{}
	return nil
}

func validatePrizeInputs(inputs []dto.TrackPrizeInput) ([]models.TrackPrize, int64, error) {
	prizes := make([]models.TrackPrize, 0, len(inputs))
	places := make(map[int]struct{}, len(inputs))
	titles := make(map[string]struct{}, len(inputs))
	var total int64
	for _, in := range inputs {
		if (in.Place == nil) == (in.Title == nil) {
			return nil, 0, models.NewValidation("a prize is either a place or a nomination",
				models.FieldError{Field: "place",
					Message: "exactly one of place or title is expected"})
		}
		prize := models.TrackPrize{}
		if in.Place != nil {
			if err := validatePlace(*in.Place, places); err != nil {
				return nil, 0, err
			}
			place := *in.Place
			prize.Place = &place
		} else {
			title, err := validateNominationTitle(*in.Title, titles)
			if err != nil {
				return nil, 0, err
			}
			prize.Title = &title
		}
		amount, err := parseWholeAmount("amount", in.Amount)
		if err != nil {
			return nil, 0, err
		}
		total += amount
		prize.Amount = strconv.FormatInt(amount, 10)
		prizes = append(prizes, prize)
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
