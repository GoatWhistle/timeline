package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// HackathonController обслуживает хакатоны и их этапы.
type HackathonController struct {
	hackathons HackathonService
	stages     StageService
	pageDef    int
	pageMax    int
}

// NewHackathonController создаёт контроллер хакатонов.
func NewHackathonController(h HackathonService, s StageService, pageDef, pageMax int) *HackathonController {
	return &HackathonController{hackathons: h, stages: s, pageDef: pageDef, pageMax: pageMax}
}

// List godoc
//
//	@Summary		Список хакатонов
//	@Description	Административный список со всеми состояниями, поиском и фильтрами.
//	@Tags			hackathons
//	@Produce		json
//	@Security		CookieAuth
//	@Param			search			query		string	false	"Поиск по названию и организатору"
//	@Param			state			query		string	false	"Фильтр состояний через запятую"	Enums(UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED)
//	@Param			include_archived	query	bool	false	"Показывать архивные"
//	@Param			page			query		int		false	"Номер страницы"	default(1)
//	@Param			page_size		query		int		false	"Размер страницы"	default(50)
//	@Success		200				{object}	models.HackathonPage
//	@Failure		403				{object}	models.ErrorResponse
//	@Router			/admin/hackathons [get]
func (c *HackathonController) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter := models.HackathonFilter{
		Search:          httpx.QueryTrimmed(r, "search"),
		States:          parseStates(httpx.QueryTrimmed(r, "state")),
		IncludeArchived: archived,
	}
	items, total, err := c.hackathons.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	now := time.Now().UTC()
	out := make([]models.HackathonResponse, 0, len(items))
	for i := range items {
		out = append(out, hackathonResponse(&items[i], now, true))
	}
	httpx.JSON(w, http.StatusOK, models.HackathonPage{Items: out, Meta: httpx.Meta(page, total)})
}

func parseStates(raw string) []models.HackathonState {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	states := make([]models.HackathonState, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(strings.ToUpper(p)); p != "" {
			states = append(states, models.HackathonState(p))
		}
	}
	return states
}

// Create godoc
//
//	@Summary		Создание хакатона
//	@Description	Хакатон создаётся неопубликованным; end_at обязан быть позже start_at.
//	@Tags			hackathons
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			request	body		models.CreateHackathonRequest	true	"Данные хакатона"
//	@Success		201		{object}	models.HackathonResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Router			/admin/hackathons [post]
func (c *HackathonController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateHackathonRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.hackathons.Create(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, hackathonResponse(h, time.Now().UTC(), true))
}

// Get godoc
//
//	@Summary		Хакатон целиком
//	@Description	Административное чтение, включая заметки.
//	@Tags			hackathons
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.HackathonResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id} [get]
func (c *HackathonController) Get(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.hackathons.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, hackathonResponse(h, time.Now().UTC(), true))
}

// Update godoc
//
//	@Summary		Изменение хакатона
//	@Description	Изменение end_at увеличивает schedule_version регистрации, отменяет устаревшие
//	@Description	ожидающие уведомления и запускает согласование. Нарушение условия
//	@Description	deadline_at <= end_at отклоняется.
//	@Tags			hackathons
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.UpdateHackathonRequest	true	"Изменяемые поля"
//	@Success		200		{object}	models.HackathonResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"дедлайн регистрации выходит за end_at"
//	@Router			/admin/hackathons/{id} [patch]
func (c *HackathonController) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateHackathonRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.hackathons.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, hackathonResponse(h, time.Now().UTC(), true))
}

// Publish godoc
//
//	@Summary		Публикация хакатона
//	@Description	Хакатон становится видимым участникам и планировщику; отложенные первичные
//	@Description	уведомления создаются согласованием.
//	@Tags			hackathons
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.HackathonResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Failure		409	{object}	models.ErrorResponse	"хакатон уже опубликован или архивирован"
//	@Router			/admin/hackathons/{id}/publish [post]
func (c *HackathonController) Publish(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.hackathons.Publish(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, hackathonResponse(h, time.Now().UTC(), true))
}

// Archive godoc
//
//	@Summary		Архивирование хакатона
//	@Description	Конечное состояние MVP: ожидающие уведомления отменяются, новые не создаются.
//	@Tags			hackathons
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.HackathonResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Failure		409	{object}	models.ErrorResponse	"хакатон уже архивирован"
//	@Router			/admin/hackathons/{id}/archive [post]
func (c *HackathonController) Archive(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.hackathons.Archive(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, hackathonResponse(h, time.Now().UTC(), true))
}

// ListStages godoc
//
//	@Summary		Этапы хакатона
//	@Description	Доступно назначенному участнику для опубликованного хакатона и администратору всегда.
//	@Tags			stages
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{array}		models.StageResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/hackathons/{id}/stages [get]
func (c *HackathonController) ListStages(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.stages.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]models.StageResponse, 0, len(items))
	for i := range items {
		out = append(out, stageResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// CreateStage godoc
//
//	@Summary		Создание этапа
//	@Description	Пересечения этапов и выход за период хакатона допускаются. Этап не порождает уведомлений.
//	@Tags			stages
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string						true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.CreateStageRequest	true	"Данные этапа"
//	@Success		201		{object}	models.StageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/stages [post]
func (c *HackathonController) CreateStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, err := c.stages.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, stageResponse(s))
}

// UpdateStage godoc
//
//	@Summary		Изменение этапа
//	@Tags			stages
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string						true	"Идентификатор этапа"	format(uuid)
//	@Param			request	body		models.UpdateStageRequest	true	"Изменяемые поля"
//	@Success		200		{object}	models.StageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/stages/{id} [patch]
func (c *HackathonController) UpdateStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, err := c.stages.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, stageResponse(s))
}

// DeleteStage godoc
//
//	@Summary		Удаление этапа
//	@Tags			stages
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path	string	true	"Идентификатор этапа"	format(uuid)
//	@Success		204	"этап удалён"
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/stages/{id} [delete]
func (c *HackathonController) DeleteStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.stages.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
