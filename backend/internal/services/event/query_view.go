package event

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func eventView(h *models.Event, stages []models.Stage, now time.Time) dto.EventResponse {
	return dto.EventResponse{
		ID:               h.DisplayID,
		Title:            h.Title,
		Description:      h.Description,
		Organizer:        h.Organizer,
		WebsiteURL:       h.WebsiteURL,
		Kind:             h.Kind,
		Format:           h.Format,
		Origin:           h.Origin,
		CountryCode:      h.CountryCode,
		City:             h.City,
		EffectiveFormat:  models.DeriveEventFormat(h, stages),
		Tracks:           dto.TrackSummaries(h.Tracks),
		PrizePool:        h.PrizePool,
		PrizeCurrency:    h.PrizeCurrency,
		TeamSizeMin:      h.TeamSizeMin,
		TeamSizeMax:      h.TeamSizeMax,
		CoverURL:         h.EffectiveCoverURL(),
		CoverSource:      h.EffectiveCoverSource(),
		Color:            h.Color(),
		StartAt:          h.StartAt,
		EndAt:            h.EndAt,
		State:            h.State(now),
		PublishedAt:      h.PublishedAt,
		ArchivedAt:       h.ArchivedAt,
		PurgeScheduledAt: h.PurgeScheduledAt,
		CreatedAt:        h.CreatedAt,
		UpdatedAt:        h.UpdatedAt,
	}
}

func stageView(s *models.Stage, event *models.Event) dto.StageResponse {
	return dto.StageResponse{
		ID:          s.DisplayID,
		EventID:     event.DisplayID,
		Name:        s.Name,
		Type:        s.Type,
		StartAt:     s.StartAt,
		EndAt:       s.EndAt,
		Description: s.Description,
		URL:         s.URL,
		Format:      s.Format,
		CountryCode: s.CountryCode,
		City:        s.City,
		Venue:       s.Venue,
		OnlineURL:   s.OnlineURL,
		Place:       s.ResolvePlace(event),
		SortOrder:   s.SortOrder,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}
