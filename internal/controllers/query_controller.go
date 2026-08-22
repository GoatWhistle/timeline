package controllers

import (
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// QueryController обслуживает read-модели: списки, карточку и временную шкалу.
type QueryController struct {
	svc     QueryService
	pageDef int
	pageMax int
}

// NewQueryController создаёт контроллер read-моделей.
func NewQueryController(svc QueryService, pageDef, pageMax int) *QueryController {
	return &QueryController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// MyHackathons godoc
//
//	@Summary		Мои хакатоны
//	@Description	Опубликованные хакатоны с назначенным участием: UPCOMING, ACTIVE и FINISHED.
//	@Description	Архивные скрыты по умолчанию и доступны фильтром.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			include_archived	query	bool	false	"Показывать архивные"
//	@Param			state				query	string	false	"Фильтр состояний через запятую"	Enums(UPCOMING,ACTIVE,FINISHED,ARCHIVED)
//	@Param			page				query	int		false	"Номер страницы"	default(1)
//	@Param			page_size			query	int		false	"Размер страницы"	default(50)
//	@Success		200					{object}	models.MyHackathonPage
//	@Failure		401					{object}	models.ErrorResponse
//	@Router			/me/hackathons [get]
func (c *QueryController) MyHackathons(w http.ResponseWriter, r *http.Request) {
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
	filter := models.MyHackathonFilter{IncludeArchived: archived, States: parseStates(httpx.QueryTrimmed(r, "state"))}
	items, total, err := c.svc.MyHackathons(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MyHackathonPage{Items: items, Meta: httpx.Meta(page, total)})
}

// HackathonCard godoc
//
//	@Summary		Карточка назначенного хакатона
//	@Description	Функция участника, вычисляемое состояние, этапы, ближайший этап, статус регистрации,
//	@Description	дедлайн и ссылка. Административные заметки участнику не отдаются.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.HackathonCard
//	@Failure		401	{object}	models.ErrorResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/hackathons/{id} [get]
func (c *QueryController) HackathonCard(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	card, err := c.svc.HackathonCard(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, card)
}

// MyTimeline godoc
//
//	@Summary		Временная шкала пользователя
//	@Description	Только назначенные опубликованные неархивные хакатоны. Каждый хакатон — отдельная строка,
//	@Description	этапы отдаются интервалами, дедлайн регистрации — отдельным маркером.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			from	query		string	false	"Начало периода, RFC3339"
//	@Param			to		query		string	false	"Конец периода, RFC3339"
//	@Success		200		{object}	models.TimelineResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		401		{object}	models.ErrorResponse
//	@Router			/me/timeline [get]
func (c *QueryController) MyTimeline(w http.ResponseWriter, r *http.Request) {
	filter, err := c.timelineFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	tl, err := c.svc.MyTimeline(r.Context(), middleware.ActorFrom(r), filter)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, tl)
}

// AdminTimeline godoc
//
//	@Summary		Административная временная шкала
//	@Description	Все хакатоны с фильтрами по состоянию, участнику и диапазону дат.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			from				query		string	false	"Начало периода, RFC3339"
//	@Param			to					query		string	false	"Конец периода, RFC3339"
//	@Param			state				query		string	false	"Фильтр состояний через запятую"
//	@Param			participant_user_id	query		string	false	"Фильтр по участнику"	format(uuid)
//	@Param			include_archived	query		bool	false	"Показывать архивные"
//	@Success		200					{object}	models.TimelineResponse
//	@Failure		400					{object}	models.ErrorResponse
//	@Failure		403					{object}	models.ErrorResponse
//	@Router			/admin/timeline [get]
func (c *QueryController) AdminTimeline(w http.ResponseWriter, r *http.Request) {
	filter, err := c.timelineFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	userID, err := httpx.QueryUUID(r, "participant_user_id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter.ParticipantUser = userID
	filter.States = parseStates(httpx.QueryTrimmed(r, "state"))
	tl, err := c.svc.AdminTimeline(r.Context(), middleware.ActorFrom(r), filter)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, tl)
}

func (c *QueryController) timelineFilter(r *http.Request) (models.TimelineFilter, error) {
	now := time.Now().UTC()
	filter := models.TimelineFilter{
		From: now.AddDate(0, -1, 0),
		To:   now.AddDate(0, 3, 0),
	}
	from, err := httpx.QueryTime(r, "from")
	if err != nil {
		return filter, err
	}
	to, err := httpx.QueryTime(r, "to")
	if err != nil {
		return filter, err
	}
	if from != nil {
		filter.From = *from
	}
	if to != nil {
		filter.To = *to
	}
	if !filter.To.After(filter.From) {
		return filter, models.NewValidation("to должен быть позже from")
	}
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		return filter, err
	}
	filter.IncludeArchived = archived
	return filter, nil
}

// Upcoming godoc
//
//	@Summary		Ближайшие дедлайны регистрации
//	@Description	Участники со статусом TODO, у которых дедлайн наступает в пределах указанного окна.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			within_hours	query		int	false	"Окно в часах"		default(72)
//	@Param			page			query		int	false	"Номер страницы"	default(1)
//	@Param			page_size		query		int	false	"Размер страницы"	default(50)
//	@Success		200				{object}	models.DeadlinePage
//	@Failure		403				{object}	models.ErrorResponse
//	@Router			/admin/queries/upcoming [get]
func (c *QueryController) Upcoming(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	within := 72 * time.Hour
	if v := httpx.QueryTrimmed(r, "within_hours"); v != "" {
		d, err := time.ParseDuration(v + "h")
		if err != nil || d <= 0 {
			httpx.Error(w, r, models.NewValidation("within_hours должен быть положительным числом"))
			return
		}
		within = d
	}
	items, total, err := c.svc.Upcoming(r.Context(), middleware.ActorFrom(r), within, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.DeadlinePage{Items: items, Meta: httpx.Meta(page, total)})
}

// Overdue godoc
//
//	@Summary		Просроченные регистрации
//	@Description	Участники со статусом TODO, у которых дедлайн уже прошёл, а хакатон ещё не завершён.
//	@Tags			queries
//	@Produce		json
//	@Security		CookieAuth
//	@Param			page		query		int	false	"Номер страницы"	default(1)
//	@Param			page_size	query		int	false	"Размер страницы"	default(50)
//	@Success		200			{object}	models.DeadlinePage
//	@Failure		403			{object}	models.ErrorResponse
//	@Router			/admin/queries/overdue [get]
func (c *QueryController) Overdue(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.Overdue(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.DeadlinePage{Items: items, Meta: httpx.Meta(page, total)})
}
