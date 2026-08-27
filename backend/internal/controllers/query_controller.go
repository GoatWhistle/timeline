package controllers

import (
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type QueryController struct {
	svc     QueryService
	pageDef int
	pageMax int
}

func NewQueryController(svc QueryService, pageDef, pageMax int) *QueryController {
	return &QueryController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// @Summary		My events
// @Description	Published events with an assigned participation: UPCOMING, ACTIVE and FINISHED.
// @Description	Archived records are hidden by default and available through a filter.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			include_archived	query		bool	false	"Include archived records"
// @Param			state				query		string	false	"Comma-separated state filter"	Enums(UPCOMING,ACTIVE,FINISHED,ARCHIVED)
// @Param			page				query		int		false	"Page number"					default(1)
// @Param			page_size			query		int		false	"Page size"					default(50)
// @Success		200					{object}	models.MyEventPage
// @Failure		401					{object}	models.ErrorResponse
// @Router			/me/events [get]
func (c *QueryController) MyEvents(w http.ResponseWriter, r *http.Request) {
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
	filter := models.MyEventFilter{IncludeArchived: archived, States: parseStates(httpx.QueryTrimmed(r, "state"))}
	items, total, err := c.svc.MyEvents(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MyEventPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Assigned event card
// @Description	Participant role, computed state, stages, the nearest stage, registration status,
// @Description	deadline and link. Administrative notes are withheld from the participant.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.EventCard
// @Failure		401	{object}	models.ErrorResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/events/{id} [get]
func (c *QueryController) EventCard(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	card, err := c.svc.EventCard(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, card)
}

// @Summary		User timeline
// @Description	Only assigned, published, non-archived events. Each event is a separate row,
// @Description	stages are returned as intervals and the registration deadline as a separate marker.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			from	query		string	false	"Start of the period, RFC3339"
// @Param			to		query		string	false	"End of the period, RFC3339"
// @Success		200		{object}	models.TimelineResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Router			/me/timeline [get]
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

// @Summary		Administrative timeline
// @Description	All events with filters by state, participant and date range.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			from				query		string	false	"Start of the period, RFC3339"
// @Param			to					query		string	false	"End of the period, RFC3339"
// @Param			state				query		string	false	"Comma-separated state filter"
// @Param			participant_user_id	query		string	false	"Filter by participant"	format(uuid)
// @Param			include_archived	query		bool	false	"Include archived records"
// @Success		200					{object}	models.TimelineResponse
// @Failure		400					{object}	models.ErrorResponse
// @Failure		403					{object}	models.ErrorResponse
// @Router			/admin/timeline [get]
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
		return filter, models.NewValidation("to must be later than from")
	}
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		return filter, err
	}
	filter.IncludeArchived = archived
	return filter, nil
}

// @Summary		Upcoming registration deadlines
// @Description	Participants in TODO whose deadline falls within the given window.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			within_hours	query		int	false	"Window in hours"		default(72)
// @Param			page			query		int	false	"Page number"	default(1)
// @Param			page_size		query		int	false	"Page size"	default(50)
// @Success		200				{object}	models.DeadlinePage
// @Failure		403				{object}	models.ErrorResponse
// @Router			/admin/queries/upcoming [get]
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
			httpx.Error(w, r, models.NewValidation("within_hours must be a positive number"))
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

// @Summary		Overdue registrations
// @Description	Participants in TODO whose deadline has passed while the event has not finished.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			page		query		int	false	"Page number"	default(1)
// @Param			page_size	query		int	false	"Page size"	default(50)
// @Success		200			{object}	models.DeadlinePage
// @Failure		403			{object}	models.ErrorResponse
// @Router			/admin/queries/overdue [get]
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
