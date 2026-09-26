package event

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Controller struct {
	events  EventService
	stages  StageService
	tracks  TrackService
	pageDef int
	pageMax int
}

func NewController(h EventService, s StageService, t TrackService,
	pageDef, pageMax int) *Controller {
	return &Controller{events: h, stages: s, tracks: t, pageDef: pageDef, pageMax: pageMax}
}

func (c *Controller) eventID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindEvent, c.events.ResolveDisplayID)
}

func (c *Controller) stageID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindStage, c.stages.ResolveDisplayID)
}

// @Summary		Event list
// @Description	Administrative list with every state, search and filters.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			search				query		string	false	"Search by title and organiser"
// @Param			state				query		string	false	"Comma-separated state filter"	Enums(UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED)
// @Param			kind				query		string	false	"Comma-separated kind filter"	Enums(HACKATHON,MEETUP)
// @Param			origin				query		string	false	"Comma-separated origin filter"	Enums(RU,WORLD)
// @Param			format				query		string	false	"Comma-separated format filter"	Enums(ONLINE,OFFLINE,HYBRID)
// @Param			include_archived	query		bool	false	"Include archived records"
// @Param			from				query		string	false	"Events ending on or after this moment"
// @Param			to					query		string	false	"Events starting on or before this moment"
// @Param			sort				query		string	false	"Sort field"		Enums(start_at,end_at,title,duration,prize,team_min,team_max,tracks)
// @Param			order				query		string	false	"Sort direction"	Enums(asc,desc)
// @Param			page				query		int		false	"Page number"		default(1)
// @Param			page_size			query		int		false	"Page size"			default(50)
// @Success		200					{object}	dto.EventPage
// @Failure		400					{object}	dto.ErrorResponse
// @Failure		403					{object}	dto.ErrorResponse
// @Router			/admin/events [get]
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter, err := parseEventFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.events.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	now := time.Now().UTC()
	out := make([]dto.EventResponse, 0, len(items))
	for i := range items {
		out = append(out, presenter.EventResponse(&items[i], now, true))
	}
	httpx.JSON(w, http.StatusOK, dto.EventPage{Items: out, Meta: httpx.Meta(page, total)})
}

func parseEventFilter(r *http.Request) (models.EventFilter, error) {
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		return models.EventFilter{}, err
	}
	from, err := httpx.QueryTime(r, "from")
	if err != nil {
		return models.EventFilter{}, err
	}
	to, err := httpx.QueryTime(r, "to")
	if err != nil {
		return models.EventFilter{}, err
	}
	sort, err := models.ParseCatalogSort(
		strings.ToLower(httpx.QueryTrimmed(r, "sort")),
		strings.ToLower(httpx.QueryTrimmed(r, "order")),
	)
	if err != nil {
		return models.EventFilter{}, err
	}
	return models.EventFilter{
		Search:          httpx.QueryTrimmed(r, "search"),
		States:          parseStates(httpx.QueryTrimmed(r, "state")),
		Kinds:           parseKinds(httpx.QueryTrimmed(r, "kind")),
		Origins:         parseOrigins(httpx.QueryTrimmed(r, "origin")),
		Formats:         parseFormats(httpx.QueryTrimmed(r, "format")),
		IncludeArchived: archived,
		From:            from,
		To:              to,
		Sort:            sort,
	}, nil
}

func parseStates(raw string) []models.EventState {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	states := make([]models.EventState, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(strings.ToUpper(p)); p != "" {
			states = append(states, models.EventState(p))
		}
	}
	return states
}

// @Summary		Create an event
// @Description	The event is created unpublished; end_at must be later than start_at.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.CreateEventRequest	true	"Event payload"
// @Success		201		{object}	dto.EventResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Router			/admin/events [post]
func (c *Controller) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Create(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, presenter.EventResponse(h, time.Now().UTC(), true))
}

// @Summary		The whole event
// @Description	Administrative read of the whole event.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/events/{id} [get]
func (c *Controller) Get(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	actor := middleware.ActorFrom(r)
	h, err := c.events.Get(r.Context(), actor, id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	stages, _, err := c.stages.List(r.Context(), actor, id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.EventResponseWithStages(h, stages, time.Now().UTC(), true))
}

// @Summary		Update an event
// @Description	Changing end_at increments the registration schedule_version, cancels stale
// @Description	pending notifications and triggers reconciliation. Violating the condition
// @Description	deadline_at <= end_at is rejected.
// @Description
// @Description	The kind is fixed once the event exists: a hackathon never becomes a meetup.
// @Description	Sending the kind it already has is not an attempted change and is accepted;
// @Description	sending a different one is refused with invalid_state_transition and leaves
// @Description	the event as it was.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.UpdateEventRequest	true	"Mutable fields"
// @Success		200		{object}	dto.EventResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"the kind was changed, or the registration deadline falls outside end_at"
// @Router			/admin/events/{id} [patch]
func (c *Controller) Update(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.EventResponse(h, time.Now().UTC(), true))
}

// @Summary		Publish an event
// @Description	The event becomes visible to participants and the scheduler; deferred primary
// @Description	notifications are created by reconciliation.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		409	{object}	dto.ErrorResponse	"the event is already published or archived"
// @Router			/admin/events/{id}/publish [post]
func (c *Controller) Publish(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Publish(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.EventResponse(h, time.Now().UTC(), true))
}

// @Summary		Archive an event
// @Description	Terminal state in the MVP: pending notifications are cancelled and no new ones are created.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		409	{object}	dto.ErrorResponse	"event is already archived"
// @Router			/admin/events/{id}/archive [post]
func (c *Controller) Archive(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Archive(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.EventResponse(h, time.Now().UTC(), true))
}
