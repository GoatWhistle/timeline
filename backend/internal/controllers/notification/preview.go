package notification

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type PreviewService interface {
	ResolveStatusDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	PreviewNotification(
		ctx context.Context, actor models.Actor, statusID uuid.UUID, req dto.NotificationPreviewQuery,
	) (*dto.NotificationPreviewResponse, error)
}

type PreviewController struct {
	svc     PreviewService
	limiter httpsession.Limiter
	limit   int
	window  time.Duration
}

func NewPreviewController(svc PreviewService, limiter httpsession.Limiter, limit int,
	window time.Duration) *PreviewController {
	return &PreviewController{svc: svc, limiter: limiter, limit: limit, window: window}
}

// @Summary		Render a notification without sending it
// @Description	Returns the text a recipient would receive for one registration status: the subject,
// @Description	the body and the channels that would carry it.
// @Description
// @Description	The call has no side effects at all. No notification row is created, no logical_key is
// @Description	claimed and no deduplication state is touched, no provider is contacted and nothing
// @Description	reaches the audit log. Calling it twice changes nothing and never suppresses a real
// @Description	notification that the scheduler is about to create.
// @Description
// @Description	The text is rendered in the recipient's own language taken from their profile, not in
// @Description	the language of the administrator asking: the point of a preview is to show what the
// @Description	recipient will read.
// @Description
// @Description	Pass occasion to choose what is rendered. Omit it for the primary
// @Description	REGISTRATION_REQUIRED notification. REMINDER_REGISTRATION_DEADLINE additionally needs
// @Description	days_before, one of 1, 2, 3, 7 or 14, because the reminder text names the remaining
// @Description	days; scheduled_at then shows when that reminder would fire for this deadline.
// @Description	Reminders are configured by each recipient in their own profile, so a preview shows
// @Description	the wording of an occasion, not a promise that this recipient asked for it.
// @Description	A status that reconciliation would skip — an unpublished or archived event, an
// @Description	inactive registration, a participant who is no longer assigned, a status that is not
// @Description	TODO or a deactivated recipient — has no notification to render and answers 404.
// @Description
// @Description	channel_ready=false means the recipient currently has no usable channel. That is not an
// @Description	error of the preview: it is precisely what the administrator needs to see.
// @Tags			notifications
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Registration status"		example(rs_42ej2s5gh7)
// @Param			occasion	query		string	false	"Occasion to render"		Enums(REGISTRATION_REQUIRED, REGISTRATION_OVERDUE, REMINDER_REGISTRATION_DEADLINE)
// @Param			days_before	query		int		false	"Days before the deadline"	Enums(1, 2, 3, 7, 14)
// @Success		200			{object}	dto.NotificationPreviewResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse	"nothing to render"
// @Failure		429			{object}	dto.ErrorResponse
// @Router			/admin/registration-statuses/{id}/notification-preview [get]
func (c *PreviewController) Notification(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	if c.limiter != nil && !c.limiter.Allow("notification-preview:"+actor.UserID.String(), c.limit, c.window) {
		httpx.Error(w, r, models.NewRateLimited("too many preview requests, try again later"))
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindRegistrationStatus, c.svc.ResolveStatusDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	req, err := previewQuery(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	preview, err := c.svc.PreviewNotification(r.Context(), actor, id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, preview)
}

func previewQuery(r *http.Request) (dto.NotificationPreviewQuery, error) {
	req := dto.NotificationPreviewQuery{Occasion: r.URL.Query().Get("occasion")}
	raw := r.URL.Query().Get("days_before")
	if raw == "" {
		return req, nil
	}
	days, err := strconv.Atoi(raw)
	if err != nil {
		return req, models.NewValidation("days_before must be a whole number",
			models.FieldError{Field: "days_before", Message: "allowed values are 1, 2, 3, 7 and 14"})
	}
	req.DaysBefore = &days
	return req, nil
}
