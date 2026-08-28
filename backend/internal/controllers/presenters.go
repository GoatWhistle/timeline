package controllers

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func meResponse(u *models.User) models.MeResponse {
	return models.MeResponse{
		ID:               u.ID,
		DisplayName:      u.DisplayName,
		Email:            u.Email,
		PendingEmail:     u.PendingEmail,
		EmailVerified:    u.EmailVerified(),
		TelegramUsername: u.TelegramUsername,
		TelegramLinked:   u.TelegramLinked(),
		PreferredChannel: u.PreferredChannel,
		IsAdmin:          u.IsAdmin,
		IsActive:         u.IsActive,
		CreatedAt:        u.CreatedAt,
		UpdatedAt:        u.UpdatedAt,
	}
}

func eventResponse(h *models.Event, now time.Time, admin bool) models.EventResponse {
	return eventResponseWithStages(h, nil, now, admin)
}

func eventResponseWithStages(h *models.Event, stages []models.Stage, now time.Time,
	admin bool) models.EventResponse {
	resp := models.EventResponse{
		ID:              h.ID,
		Title:           h.Title,
		Description:     h.Description,
		Organizer:       h.Organizer,
		WebsiteURL:      h.WebsiteURL,
		Kind:            h.Kind,
		Format:          h.Format,
		Origin:          h.Origin,
		CountryCode:     h.CountryCode,
		City:            h.City,
		EffectiveFormat: models.DeriveEventFormat(h, stages),
		Track:           h.Track,
		PrizePool:       h.PrizePool,
		PrizeCurrency:   h.PrizeCurrency,
		TeamSizeMax:     h.TeamSizeMax,
		StartAt:         h.StartAt,
		EndAt:           h.EndAt,
		State:           h.State(now),
		PublishedAt:     h.PublishedAt,
		ArchivedAt:      h.ArchivedAt,
		CreatedAt:       h.CreatedAt,
		UpdatedAt:       h.UpdatedAt,
	}
	if admin {
		resp.Notes = h.Notes
	}
	return resp
}

func stageResponse(s *models.Stage, event *models.Event) models.StageResponse {
	return models.StageResponse{
		ID:          s.ID,
		EventID:     s.EventID,
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

func registrationResponse(r *models.Registration) models.RegistrationResponse {
	return models.RegistrationResponse{
		ID:                         r.ID,
		EventID:                    r.EventID,
		URL:                        r.URL,
		DeadlineAt:                 r.DeadlineAt,
		Description:                r.Description,
		State:                      r.State,
		ScheduleVersion:            r.ScheduleVersion,
		ActivationVersion:          r.ActivationVersion,
		NotificationContentVersion: r.NotificationContentVersion,
		CreatedAt:                  r.CreatedAt,
		UpdatedAt:                  r.UpdatedAt,
	}
}

func ruleResponse(r *models.NotificationRule) models.NotificationRuleResponse {
	return models.NotificationRuleResponse{
		ID:              r.ID,
		RegistrationID:  r.RegistrationID,
		OffsetMinutes:   r.OffsetMinutes,
		Type:            r.NotificationType(),
		Enabled:         r.Enabled,
		SlotNo:          r.SlotNo,
		ChannelOverride: r.ChannelOverride,
		CreatedAt:       r.CreatedAt,
		UpdatedAt:       r.UpdatedAt,
	}
}

func inviteResponse(i *models.Invite) models.InviteResponse {
	return models.InviteResponse{
		ID:              i.ID,
		Email:           i.NormalizedEmail,
		CreatedByUserID: i.CreatedByUserID,
		ExpiresAt:       i.ExpiresAt,
		AcceptedAt:      i.AcceptedAt,
		RevokedAt:       i.RevokedAt,
		CreatedAt:       i.CreatedAt,
	}
}
