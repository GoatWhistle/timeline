package controllers

import (
	"context"
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type AuditService interface {
	List(
		ctx context.Context, actor models.Actor, filter models.AuditFilter, page models.Page,
	) ([]models.AuditResponse, int64, error)
}

type AuditController struct {
	svc     AuditService
	pageDef int
	pageMax int
}

func NewAuditController(svc AuditService, pageDef, pageMax int) *AuditController {
	return &AuditController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// @Summary		Audit log
// @Description	Restricted to administrators. Entries are immutable; file export is not supported in the MVP.
// @Tags			audit
// @Produce		json
// @Security		CookieAuth
// @Param			actor_user_id	query		string	false	"Filter by actor"	format(uuid)
// @Param			action			query		string	false	"Filter by action"
// @Param			entity_type		query		string	false	"Filter by entity type"
// @Param			entity_id		query		string	false	"Filter by entity identifier"	format(uuid)
// @Param			from			query		string	false	"Start of the period, RFC3339"
// @Param			to				query		string	false	"End of the period, RFC3339"
// @Param			page			query		int		false	"Page number"	default(1)
// @Param			page_size		query		int		false	"Page size"		default(50)
// @Success		200				{object}	models.AuditPage
// @Failure		400				{object}	models.ErrorResponse
// @Failure		403				{object}	models.ErrorResponse
// @Router			/admin/audit [get]
func (c *AuditController) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	actorID, err := httpx.QueryUUID(r, "actor_user_id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	entityID, err := httpx.QueryUUID(r, "entity_id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	from, err := httpx.QueryTime(r, "from")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	to, err := httpx.QueryTime(r, "to")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter := models.AuditFilter{
		ActorUserID: actorID,
		Action:      httpx.QueryTrimmed(r, "action"),
		EntityType:  httpx.QueryTrimmed(r, "entity_type"),
		EntityID:    entityID,
		From:        from,
		To:          to,
	}
	items, total, err := c.svc.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.AuditPage{Items: items, Meta: httpx.Meta(page, total)})
}
