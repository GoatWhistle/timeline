package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Your own reminder schedule
// @Description	Reminders belong to the recipient, not to the organiser of an event: an organiser
// @Description	creates stages and a registration, and you alone decide how long before each of those
// @Description	moments you want to hear about it. One setting covers every event you take part in.
// @Description
// @Description	Each occasion carries its own set of days, because "a week before the deadline" and
// @Description	"a week before a stage" are different wishes. An empty set means this occasion never
// @Description	reaches you. day_choices lists the days the server accepts.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.ReminderScheduleResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/reminder-schedule [get]
func (c *ProfileController) ReminderSchedule(w http.ResponseWriter, r *http.Request) {
	schedule, err := c.svc.ReminderSchedule(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.ReminderScheduleResponse(schedule))
}

// @Summary		Replace your reminder schedule
// @Description	The body replaces the whole schedule: an occasion left out of the list is cleared, and
// @Description	so days are never merged with what was stored before. Allowed days are 1, 2, 3, 7 and
// @Description	14; hours are deliberately not offered.
// @Description
// @Description	overdue_enabled asks to be told when a registration deadline has passed while your
// @Description	status still says nothing was done. It is a switch, not a schedule: the moment is a
// @Description	fixed lead after the deadline, set by the server.
// @Description
// @Description	Saving bumps the schedule version and cancels every reminder already queued for you
// @Description	that has not been handed to a provider, so a shortened schedule stops sending at once
// @Description	rather than after the old plan drains.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.UpdateReminderScheduleRequest	true	"The schedule to store"
// @Success		200		{object}	dto.ReminderScheduleResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Router			/me/reminder-schedule [put]
func (c *ProfileController) UpdateReminderSchedule(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateReminderScheduleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	schedule, err := c.svc.ReplaceReminderSchedule(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.ReminderScheduleResponse(schedule))
}
