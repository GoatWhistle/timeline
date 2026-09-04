package notification

import (
	"context"
	"net/http"
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
	ResolveRuleDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	PreviewNotification(
		ctx context.Context, actor models.Actor, statusID uuid.UUID, ruleID *uuid.UUID,
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
// @Description	the body, the channel that the rules of specification section 10 would pick and the
// @Description	moment the entry would be scheduled for.
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
// @Description	Pass rule_id to preview a reminder or an overdue notice; the type follows the sign of
// @Description	the rule offset. Omit it for the primary REGISTRATION_REQUIRED notification, which has
// @Description	no rule. A status that reconciliation would skip — an unpublished or archived event, an
// @Description	inactive registration, a participant who is no longer assigned, a status that is not
// @Description	TODO or a deactivated recipient — has no notification to render and answers 404.
// @Description
// @Description	channel_ready=false means the recipient currently has no usable channel. That is not an
// @Description	error of the preview: it is precisely what the administrator needs to see.
// @Tags			rules
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string	true	"Registration status"	example(rs_42ej2s5gh7)
// @Param			rule_id	query		string	false	"Rule to render"		example(nr_42ej2s5gh7e8)
// @Success		200		{object}	dto.NotificationPreviewResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse	"nothing to render, or a foreign rule"
// @Failure		429		{object}	dto.ErrorResponse
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
	ruleID, err := httpx.QueryDisplayID(r, "rule_id", dto.DisplayKindNotificationRule,
		c.svc.ResolveRuleDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	preview, err := c.svc.PreviewNotification(r.Context(), actor, id, ruleID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, preview)
}
