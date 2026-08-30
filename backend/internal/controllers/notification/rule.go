package notification

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type NotificationRuleController struct {
	rules RuleService
}

func NewNotificationRuleController(rules RuleService) *NotificationRuleController {
	return &NotificationRuleController{rules: rules}
}

type RuleService interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveRuleDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.NotificationRule, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateRuleRequest,
	) (*models.NotificationRule, error)
	Update(
		ctx context.Context, actor models.Actor, ruleID uuid.UUID, req dto.UpdateRuleRequest,
	) (*models.NotificationRule, error)
	Disable(ctx context.Context, actor models.Actor, ruleID uuid.UUID) error
}

// @Summary	Reminder rules
// @Tags		rules
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success	200	{array}		dto.NotificationRuleResponse
// @Failure	403	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Router		/admin/events/{id}/registration/rules [get]
func (c *NotificationRuleController) ListRules(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.rules.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.rules.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]dto.NotificationRuleResponse, 0, len(items))
	for i := range items {
		out = append(out, shared.RuleResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a reminder rule
// @Description	The sign of offset_minutes selects the type: a positive value is a reminder before the deadline,
// @Description	zero fires at the deadline, and a negative value is an overdue notification.
// @Description	A registration accepts at most 10 rules.
// @Tags			rules
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.CreateRuleRequest	true	"Rule parameters"
// @Success		201		{object}	dto.NotificationRuleResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"a rule with this offset already exists or the slot limit is reached"
// @Router			/admin/events/{id}/registration/rules [post]
func (c *NotificationRuleController) CreateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.rules.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CreateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, shared.RuleResponse(rule))
}

// @Summary		Update a reminder rule
// @Description	Changing schedule fields increments schedule_version once per transaction
// @Description	and triggers notification reconciliation.
// @Tags			rules
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Rule identifier"	example(nr_42ej2s5gh7e8)
// @Param			request	body		dto.UpdateRuleRequest	true	"Mutable fields"
// @Success		200		{object}	dto.NotificationRuleResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/admin/registration-rules/{id} [patch]
func (c *NotificationRuleController) UpdateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindNotificationRule, c.rules.ResolveRuleDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, shared.RuleResponse(rule))
}

// @Summary		Disable a reminder rule
// @Description	The rule is set to enabled=false; the row is preserved so that the occupied slot
// @Description	and offset stay reserved.
// @Tags			rules
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Rule identifier"	example(nr_42ej2s5gh7e8)
// @Success		204	"the rule is disabled"
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/registration-rules/{id} [delete]
func (c *NotificationRuleController) DisableRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindNotificationRule, c.rules.ResolveRuleDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.rules.Disable(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
