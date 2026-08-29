package shared

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func MeResponse(u *models.User) models.MeResponse {
	return models.MeResponse{
		ID:                u.DisplayID,
		FirstName:         u.FirstName,
		MiddleName:        u.MiddleName,
		LastName:          u.LastName,
		DisplayName:       u.DisplayName(u.Locale),
		LegacyDisplayName: u.LegacyDisplayName,
		Nickname:          u.Nickname,
		ProfilePublic:     u.ProfilePublic,
		Email:             u.Email,
		PendingEmail:      u.PendingEmail,
		EmailVerified:     u.EmailVerified(),
		TelegramUsername:  u.TelegramUsername,
		TelegramLinked:    u.TelegramLinked(),
		PreferredChannel:  u.PreferredChannel,
		AvatarURL:         u.AvatarURL,
		Bio:               u.Bio,
		Locale:            u.Locale,
		Timezone:          u.Timezone,
		Shortcuts:         Shortcuts(u.Shortcuts),
		IsAdmin:           u.IsAdmin,
		IsActive:          u.IsActive,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
	}
}

func Shortcuts(s models.Shortcuts) models.Shortcuts {
	if s == nil {
		return models.Shortcuts{}
	}
	return s
}

func EventResponse(h *models.Event, now time.Time, admin bool) models.EventResponse {
	return EventResponseWithStages(h, nil, now, admin)
}

func EventResponseWithStages(h *models.Event, stages []models.Stage, now time.Time,
	admin bool) models.EventResponse {
	resp := models.EventResponse{
		ID:              h.DisplayID,
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

func StageResponse(s *models.Stage, event *models.Event) models.StageResponse {
	return models.StageResponse{
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

func RegistrationResponse(r *models.Registration, eventDisplayID string) models.RegistrationResponse {
	return models.RegistrationResponse{
		ID:                         r.DisplayID,
		EventID:                    eventDisplayID,
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

func RuleResponse(r *models.NotificationRule) models.NotificationRuleResponse {
	return models.NotificationRuleResponse{
		ID:              r.DisplayID,
		RegistrationID:  r.RegistrationDisplayID,
		OffsetMinutes:   r.OffsetMinutes,
		Type:            r.NotificationType(),
		Enabled:         r.Enabled,
		SlotNo:          r.SlotNo,
		ChannelOverride: r.ChannelOverride,
		CreatedAt:       r.CreatedAt,
		UpdatedAt:       r.UpdatedAt,
	}
}

func InviteResponse(i *models.Invite) models.InviteResponse {
	return models.InviteResponse{
		ID:              i.DisplayID,
		Email:           i.NormalizedEmail,
		CreatedByUserID: i.CreatedByUser,
		ExpiresAt:       i.ExpiresAt,
		AcceptedAt:      i.AcceptedAt,
		RevokedAt:       i.RevokedAt,
		CreatedAt:       i.CreatedAt,
	}
}
