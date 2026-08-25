package controllers

import (
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// Презентеры переводят модели в DTO ответов. Здесь же отсекаются поля,
// недоступные обычному пользователю (например, административные заметки).

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

func hackathonResponse(h *models.Hackathon, now time.Time, admin bool) models.HackathonResponse {
	resp := models.HackathonResponse{
		ID:          h.ID,
		Title:       h.Title,
		Description: h.Description,
		Organizer:   h.Organizer,
		WebsiteURL:  h.WebsiteURL,
		StartAt:     h.StartAt,
		EndAt:       h.EndAt,
		State:       h.State(now),
		PublishedAt: h.PublishedAt,
		ArchivedAt:  h.ArchivedAt,
		CreatedAt:   h.CreatedAt,
		UpdatedAt:   h.UpdatedAt,
	}
	if admin {
		resp.Notes = h.Notes
	}
	return resp
}

func stageResponse(s *models.Stage) models.StageResponse {
	return models.StageResponse{
		ID:          s.ID,
		HackathonID: s.HackathonID,
		Name:        s.Name,
		Type:        s.Type,
		StartAt:     s.StartAt,
		EndAt:       s.EndAt,
		Description: s.Description,
		URL:         s.URL,
		SortOrder:   s.SortOrder,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}

func registrationResponse(r *models.Registration) models.RegistrationResponse {
	return models.RegistrationResponse{
		ID:                         r.ID,
		HackathonID:                r.HackathonID,
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
