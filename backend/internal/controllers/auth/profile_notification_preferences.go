package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Your own per-occasion notification preferences
// @Description	One entry per occasion and channel pair. A missing pair defaults to enabled,
// @Description	so an account that never touched this endpoint keeps receiving everything
// @Description	its channel set already allows.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.NotificationPreferencesResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/notification-preferences [get]
func (c *ProfileController) NotificationPreferences(w http.ResponseWriter, r *http.Request) {
	prefs, err := c.svc.NotificationPreferences(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.NotificationPreferencesResponse{Preferences: prefs})
}

// @Summary		Switch one occasion off or on for one channel
// @Description	This flag decides whether the occasion is sent at all, independently of the channel set
// @Description	in your profile: an empty channel set means no route exists anywhere, this flag means
// @Description	you do not want this particular notification even on a route that does exist.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			occasion	path		string									true	"Occasion"	Enums(REGISTRATION_REQUIRED, REGISTRATION_OVERDUE, REMINDER_REGISTRATION_DEADLINE, REMINDER_EVENT_START, REMINDER_STAGE_START, REMINDER_EVENT_END, WEEKLY_DIGEST, PERSONAL_TASK_DUE, PERSONAL_RETROSPECTIVE_DUE)
// @Param			channel		path		string									true	"Channel"	Enums(TELEGRAM, EMAIL)
// @Param			request		body		dto.UpdateNotificationPreferenceRequest	true	"Desired state"
// @Success		200			{object}	dto.NotificationPreferencesResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Router			/me/notification-preferences/{occasion}/{channel} [put]
func (c *ProfileController) SetNotificationPreference(w http.ResponseWriter, r *http.Request) {
	occasion := models.NotificationOccasion(r.PathValue("occasion"))
	if !models.ValidOccasion(occasion) {
		httpx.Error(w, r, models.NewValidation("unknown occasion"))
		return
	}
	channel := models.Channel(r.PathValue("channel"))
	if !channel.Valid() {
		httpx.Error(w, r, models.NewValidation("unknown channel"))
		return
	}
	var req dto.UpdateNotificationPreferenceRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	prefs, err := c.svc.SetNotificationPreference(r.Context(), middleware.ActorFrom(r), occasion, channel, req.Enabled)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.NotificationPreferencesResponse{Preferences: prefs})
}
