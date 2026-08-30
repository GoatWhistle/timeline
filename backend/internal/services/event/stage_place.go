package event

import (
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type stagePlace struct {
	format      *models.EventFormat
	countryCode *string
	city        *string
	venue       *string
	onlineURL   *string
}

func normalizeVenue(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	venue := strings.TrimSpace(*value)
	if venue == "" {
		return nil, nil
	}
	normalized, err := validation.ValidateText("venue", venue, 1, 200)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func resolveStagePlace(format *models.EventFormat, clearFormat bool, countryCode, city,
	venue, onlineURL *string, current stagePlace) (stagePlace, error) {
	out := current
	if clearFormat {
		out.format = nil
		out.countryCode = nil
		out.city = nil
	}
	if format != nil {
		if !format.Valid() {
			return out, models.NewValidation("invalid stage format",
				models.FieldError{Field: "format", Message: "allowed values are ONLINE, OFFLINE and HYBRID"})
		}
		out.format = format
	}
	if countryCode != nil {
		code, err := normalizeCountryCode(countryCode)
		if err != nil {
			return out, err
		}
		out.countryCode = code
	}
	if city != nil {
		name, err := normalizeCity(city)
		if err != nil {
			return out, err
		}
		out.city = name
	}
	if venue != nil {
		name, err := normalizeVenue(venue)
		if err != nil {
			return out, err
		}
		out.venue = name
	}
	if onlineURL != nil {
		link, err := validation.OptionalURL("online_url", onlineURL)
		if err != nil {
			return out, err
		}
		out.onlineURL = link
	}
	if out.format != nil && *out.format == models.FormatOnline {
		out.countryCode = nil
		out.city = nil
	}
	return out, validateStagePlace(out)
}

func validateStagePlace(place stagePlace) error {
	if place.format == nil {
		if place.countryCode != nil || place.city != nil {
			return models.NewValidation("a stage place requires an explicit format",
				models.FieldError{Field: "format",
					Message: "set a format or leave the place empty to inherit it from the event"})
		}
		return nil
	}
	if place.format.RequiresPlace() && place.countryCode == nil {
		return models.NewValidation("an offline or hybrid stage requires a country",
			models.FieldError{Field: "country_code", Message: "required when format is OFFLINE or HYBRID"})
	}
	return nil
}

func stagePlacePatch(place stagePlace) dto.StagePlacePatch {
	return dto.StagePlacePatch{
		FormatSet: true, Format: place.format,
		CountryCode: place.countryCode, City: place.city,
		VenueSet: true, Venue: place.venue,
		OnlineURLSet: true, OnlineURL: place.onlineURL,
	}
}
