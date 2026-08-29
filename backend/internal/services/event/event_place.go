package event

import (
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type resolvedPlace struct {
	kind        models.EventKind
	format      models.EventFormat
	origin      models.EventOrigin
	countryCode *string
	city        *string
}

func normalizeCountryCode(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	code := strings.ToUpper(strings.TrimSpace(*value))
	if code == "" {
		return nil, nil
	}
	if len(code) != 2 {
		return nil, models.NewValidation("invalid country code",
			models.FieldError{Field: "country_code", Message: "ISO 3166-1 alpha-2, two letters"})
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return nil, models.NewValidation("invalid country code",
				models.FieldError{Field: "country_code", Message: "ISO 3166-1 alpha-2, two letters"})
		}
	}
	return &code, nil
}

func normalizeCity(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	city := strings.TrimSpace(*value)
	if city == "" {
		return nil, nil
	}
	normalized, err := validation.ValidateText("city", city, 1, 120)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}

func resolvePlace(kind *models.EventKind, format *models.EventFormat, origin *models.EventOrigin,
	countryCode, city *string, current resolvedPlace) (resolvedPlace, error) {
	out := current
	if kind != nil {
		if !kind.Valid() {
			return out, models.NewValidation("invalid event kind",
				models.FieldError{Field: "kind", Message: "allowed values are HACKATHON and MEETUP"})
		}
		out.kind = *kind
	}
	if format != nil {
		if !format.Valid() {
			return out, models.NewValidation("invalid event format",
				models.FieldError{Field: "format", Message: "allowed values are ONLINE, OFFLINE and HYBRID"})
		}
		out.format = *format
	}
	if origin != nil {
		if !origin.Valid() {
			return out, models.NewValidation("invalid event origin",
				models.FieldError{Field: "origin", Message: "allowed values are RU and WORLD"})
		}
		out.origin = *origin
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
	if out.format.RequiresPlace() && out.countryCode == nil {
		return out, models.NewValidation("an offline or hybrid event requires a country",
			models.FieldError{Field: "country_code", Message: "required when format is OFFLINE or HYBRID"})
	}
	if out.format == models.FormatOnline {
		out.countryCode = nil
		out.city = nil
	}
	return out, nil
}

func defaultPlace() resolvedPlace {
	return resolvedPlace{
		kind:   models.EventKindHackathon,
		format: models.FormatOnline,
		origin: models.OriginRU,
	}
}
