package controllers

import (
	"net/http"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// ParticipantController обслуживает состав участников хакатона.
type ParticipantController struct {
	svc     ParticipantService
	pageDef int
	pageMax int
}

// NewParticipantController создаёт контроллер участников.
func NewParticipantController(svc ParticipantService, pageDef, pageMax int) *ParticipantController {
	return &ParticipantController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// List godoc
//
//	@Summary		Состав участников хакатона
//	@Tags			participants
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id					path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Param			team_role			query		string	false	"Фильтр по функции участника"
//	@Param			registration_status	query		string	false	"Фильтр по статусу регистрации"	Enums(TODO,DONE,NOT_REQUIRED)
//	@Param			include_removed		query		bool	false	"Включая удалённых из состава"
//	@Param			search				query		string	false	"Поиск по имени и email"
//	@Param			page				query		int		false	"Номер страницы"	default(1)
//	@Param			page_size			query		int		false	"Размер страницы"	default(50)
//	@Success		200					{object}	models.ParticipantPage
//	@Failure		403					{object}	models.ErrorResponse
//	@Failure		404					{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/participants [get]
func (c *ParticipantController) List(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	removed, err := httpx.QueryBool(r, "include_removed")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter := models.ParticipantFilter{
		TeamRole:           httpx.QueryTrimmed(r, "team_role"),
		RegistrationStatus: models.RegistrationStatusValue(httpx.QueryTrimmed(r, "registration_status")),
		IncludeRemoved:     removed,
		Search:             httpx.QueryTrimmed(r, "search"),
	}
	items, total, err := c.svc.List(r.Context(), middleware.ActorFrom(r), id, filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.ParticipantPage{Items: items, Meta: httpx.Meta(page, total)})
}

// AddMany godoc
//
//	@Summary		Массовое добавление участников
//	@Description	Повторное добавление ранее удалённого участника реактивирует запись и увеличивает
//	@Description	assignment_version. Назначение, статус регистрации, первичное уведомление и запись
//	@Description	аудита выполняются одной транзакцией на участника; результат возвращается по каждому элементу.
//	@Tags			participants
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.AddParticipantsRequest	true	"Список пользователей и их функций"
//	@Success		200		{object}	models.BatchResult
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/participants/batch-add [post]
func (c *ParticipantController) AddMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.AddParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.AddMany(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// RemoveMany godoc
//
//	@Summary		Массовое удаление участников
//	@Description	Переводит участие в REMOVED и отменяет ожидающие уведомления. Отправленные сохраняются.
//	@Tags			participants
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string								true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.RemoveParticipantsRequest	true	"Идентификаторы участников"
//	@Success		200		{object}	models.BatchResult
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/participants/batch-remove [post]
func (c *ParticipantController) RemoveMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.RemoveParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.RemoveMany(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// CopyFrom godoc
//
//	@Summary		Копирование состава из другого хакатона
//	@Description	Переносятся только назначенные участники. Функция участника переносится как значение
//	@Description	по умолчанию и может быть переопределена. Существующие участники пропускаются
//	@Description	и возвращаются отдельными элементами результата.
//	@Tags			participants
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор целевого хакатона"	format(uuid)
//	@Param			request	body		models.CopyParticipantsRequest	true	"Источник и переопределения функций"
//	@Success		200		{object}	models.BatchResult
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/participants/copy-from [post]
func (c *ParticipantController) CopyFrom(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CopyParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.CopyFrom(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// UpdateTeamRole godoc
//
//	@Summary		Изменение функции участника
//	@Description	team_role — свободнотекстовая функция на хакатоне, а не право доступа.
//	@Tags			participants
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор участника"	format(uuid)
//	@Param			request	body		models.UpdateTeamRoleRequest	true	"Новая функция"
//	@Success		200		{object}	models.ParticipantResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/participants/{id}/team-role [patch]
func (c *ParticipantController) UpdateTeamRole(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateTeamRoleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	p, err := c.svc.UpdateTeamRole(r.Context(), middleware.ActorFrom(r), id, req.TeamRole)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}

// Reactivate godoc
//
//	@Summary		Реактивация участника
//	@Description	Возвращает участие в ASSIGNED, увеличивает assignment_version, очищает removed_at
//	@Description	и заново задаёт функцию. Существующий статус регистрации сохраняется.
//	@Tags			participants
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор участника"	format(uuid)
//	@Param			request	body		models.UpdateTeamRoleRequest	true	"Функция участника"
//	@Success		200		{object}	models.ParticipantResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"участник уже назначен"
//	@Router			/admin/participants/{id}/reactivate [post]
func (c *ParticipantController) Reactivate(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateTeamRoleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	p, err := c.svc.Reactivate(r.Context(), middleware.ActorFrom(r), id, req.TeamRole)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}
