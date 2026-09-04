package event

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const maxScheduleSpan = 366 * 24 * time.Hour

type QueryService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	MyEvents(
		ctx context.Context, actor models.Actor, filter models.MyEventFilter, page models.Page,
	) ([]dto.MyEventItem, int64, error)
	EventCard(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*dto.EventCard, error)
	MySchedule(ctx context.Context, actor models.Actor, filter models.ScheduleFilter) (*dto.ScheduleResponse, error)
	Upcoming(
		ctx context.Context, actor models.Actor, within time.Duration, page models.Page,
	) ([]dto.DeadlineItem, int64, error)
	Overdue(ctx context.Context, actor models.Actor, page models.Page) ([]dto.DeadlineItem, int64, error)
	RegistrationCoverage(ctx context.Context, actor models.Actor) (*dto.RegistrationCoverage, error)
}

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
// @Param			page_size			query		int		false	"Page size"						default(50)
// @Success		200					{object}	dto.MyEventPage
// @Failure		401					{object}	dto.ErrorResponse
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
	httpx.JSON(w, http.StatusOK, dto.MyEventPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Assigned event card
// @Description	Participant role, computed state, stages, the nearest stage, registration status,
// @Description	deadline and link.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventCard
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id} [get]
func (c *QueryController) EventCard(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveDisplayID)
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

// @Summary		User schedule
// @Description	Only assigned, published, non-archived events. Each event is a separate row,
// @Description	stages are returned as intervals and the registration deadline as a separate marker.
// @Description	registration_status is the participant's own self reported mark, never a fact the
// @Description	system verified against the external registration site.
// @Description	The response is not paginated, so the period is capped at 366 days and a wider
// @Description	one is rejected with 400 rather than answered with an unbounded document.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			from	query		string	false	"Start of the period, RFC3339. Defaults to one month ago"
// @Param			to		query		string	false	"End of the period, RFC3339. Defaults to three months ahead, at most 366 days after from"
// @Success		200		{object}	dto.ScheduleResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Router			/me/schedule [get]
func (c *QueryController) MySchedule(w http.ResponseWriter, r *http.Request) {
	filter, err := c.scheduleFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	tl, err := c.svc.MySchedule(r.Context(), middleware.ActorFrom(r), filter)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, tl)
}

func (c *QueryController) scheduleFilter(r *http.Request) (models.ScheduleFilter, error) {
	now := time.Now().UTC()
	filter := models.ScheduleFilter{
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
	if filter.To.Sub(filter.From) > maxScheduleSpan {
		return filter, models.NewValidation("the period must not exceed 366 days")
	}
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		return filter, err
	}
	filter.IncludeArchived = archived
	return filter, nil
}
