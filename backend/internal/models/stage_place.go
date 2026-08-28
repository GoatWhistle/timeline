package models

type Place struct {
	Format      EventFormat `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	CountryCode *string     `json:"country_code,omitempty" example:"RU"`
	City        *string     `json:"city,omitempty" example:"Kazan"`
	Venue       *string     `json:"venue,omitempty" example:"IT Park"`
	OnlineURL   *string     `json:"online_url,omitempty" example:"https://example.com/stream"`
	Inherited   bool        `json:"inherited" example:"true"`
}

func (s *Stage) OwnPlace() bool { return s.Format != nil }

func (s *Stage) ResolvePlace(event *Event) Place {
	if s.Format == nil {
		return Place{
			Format:      event.Format,
			CountryCode: event.CountryCode,
			City:        event.City,
			Venue:       s.Venue,
			OnlineURL:   s.OnlineURL,
			Inherited:   true,
		}
	}
	place := Place{
		Format:      *s.Format,
		CountryCode: s.CountryCode,
		City:        s.City,
		Venue:       s.Venue,
		OnlineURL:   s.OnlineURL,
		Inherited:   false,
	}
	if place.Format.RequiresPlace() {
		if place.CountryCode == nil {
			place.CountryCode = event.CountryCode
		}
		if place.City == nil {
			place.City = event.City
		}
	}
	return place
}

func (s *Stage) Offline(event *Event) bool {
	return s.ResolvePlace(event).Format.RequiresPlace()
}

func DeriveEventFormat(event *Event, stages []Stage) EventFormat {
	offline, online := event.Format != FormatOnline, event.Format != FormatOffline
	for i := range stages {
		if !stages[i].OwnPlace() {
			continue
		}
		if stages[i].Offline(event) {
			offline = true
		} else {
			online = true
		}
	}
	switch {
	case offline && online:
		return FormatHybrid
	case offline:
		return FormatOffline
	default:
		return FormatOnline
	}
}

func OfflineStages(event *Event, stages []Stage) []Stage {
	out := make([]Stage, 0, len(stages))
	for i := range stages {
		if stages[i].Offline(event) {
			out = append(out, stages[i])
		}
	}
	return out
}
