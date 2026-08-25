package controllers

import (
	"net/http"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// AuditController обслуживает чтение журнала административных изменений.
type AuditController struct {
	svc     AuditService
	pageDef int
	pageMax int
}

// NewAuditController создаёт контроллер аудита.
func NewAuditController(svc AuditService, pageDef, pageMax int) *AuditController {
	return &AuditController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// List godoc
//
//	@Summary		Журнал аудита
//	@Description	Доступен только администратору. Записи неизменяемы; выгрузка файлом в MVP не поддерживается.
//	@Tags			audit
//	@Produce		json
//	@Security		CookieAuth
//	@Param			actor_user_id	query		string	false	"Фильтр по актору"	format(uuid)
//	@Param			action			query		string	false	"Фильтр по действию"
//	@Param			entity_type		query		string	false	"Фильтр по типу объекта"
//	@Param			entity_id		query		string	false	"Фильтр по идентификатору объекта"	format(uuid)
//	@Param			from			query		string	false	"Начало периода, RFC3339"
//	@Param			to				query		string	false	"Конец периода, RFC3339"
//	@Param			page			query		int		false	"Номер страницы"	default(1)
//	@Param			page_size		query		int		false	"Размер страницы"	default(50)
//	@Success		200				{object}	models.AuditPage
//	@Failure		400				{object}	models.ErrorResponse
//	@Failure		403				{object}	models.ErrorResponse
//	@Router			/admin/audit [get]
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
