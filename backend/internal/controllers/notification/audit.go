package notification

import (
	"context"
	"net/http"
	"strings"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type AuditService interface {
	List(
		ctx context.Context, actor models.Actor, filter models.AuditFilter, page models.Page,
	) ([]dto.AuditResponse, int64, error)
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
// @Description	Restricted to administrators. Entries are immutable.
// @Description
// @Description	The actor is identified by the external display identifier of the user. The row id and
// @Description	entity_id stay internal: the journal records arbitrary entity types, which have no single
// @Description	external identifier space.
// @Description
// @Description	The search is a case-insensitive substring match over the actor email, the action and
// @Description	the entity type. Entries are sorted newest first by default; sorting by actor orders by
// @Description	the actor email and places system entries without an actor last in both directions.
// @Tags			audit
// @Produce		json
// @Security		CookieAuth
// @Param			actor_user_id	query		string	false	"Filter by actor"	example(us_3k7d8gb9be)
// @Param			action			query		string	false	"Filter by action"
// @Param			entity_type		query		string	false	"Filter by entity type"
// @Param			entity_id		query		string	false	"Filter by entity identifier"	format(uuid)
// @Param			from			query		string	false	"Start of the period, RFC3339"
// @Param			to				query		string	false	"End of the period, RFC3339"
// @Param			search			query		string	false	"Search by actor email, action and entity type"
// @Param			sort			query		string	false	"Sort field"		Enums(created_at,actor,action,entity_type)	default(created_at)
// @Param			order			query		string	false	"Sort direction"	Enums(asc,desc)								default(desc)
// @Param			page			query		int		false	"Page number"		default(1)
// @Param			page_size		query		int		false	"Page size"			default(50)
// @Success		200				{object}	dto.AuditPage
// @Failure		400				{object}	dto.ErrorResponse
// @Failure		403				{object}	dto.ErrorResponse
// @Router			/admin/audit [get]
func (c *AuditController) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter, err := parseAuditFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.AuditPage{Items: items, Meta: httpx.Meta(page, total)})
}

func parseAuditFilter(r *http.Request) (models.AuditFilter, error) {
	entityID, err := httpx.QueryUUID(r, "entity_id")
	if err != nil {
		return models.AuditFilter{}, err
	}
	from, err := httpx.QueryTime(r, "from")
	if err != nil {
		return models.AuditFilter{}, err
	}
	to, err := httpx.QueryTime(r, "to")
	if err != nil {
		return models.AuditFilter{}, err
	}
	sort, err := models.ParseAuditSort(
		strings.ToLower(httpx.QueryTrimmed(r, "sort")),
		strings.ToLower(httpx.QueryTrimmed(r, "order")),
	)
	if err != nil {
		return models.AuditFilter{}, err
	}
	return models.AuditFilter{
		ActorDisplayID: httpx.QueryTrimmed(r, "actor_user_id"),
		Action:         httpx.QueryTrimmed(r, "action"),
		EntityType:     httpx.QueryTrimmed(r, "entity_type"),
		EntityID:       entityID,
		From:           from,
		To:             to,
		Search:         httpx.QueryTrimmed(r, "search"),
		Sort:           sort,
	}, nil
}
