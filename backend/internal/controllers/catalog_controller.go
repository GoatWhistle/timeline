package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type CatalogLimiter interface {
	Allow(key string, limit int, window time.Duration) bool
}

type CatalogController struct {
	catalog CatalogService
	limiter CatalogLimiter
	limit   int
	window  time.Duration
	pageDef int
	pageMax int
}

func NewCatalogController(svc CatalogService, limiter CatalogLimiter, limit int,
	window time.Duration, pageDef, pageMax int) *CatalogController {
	return &CatalogController{
		catalog: svc, limiter: limiter, limit: limit, window: window,
		pageDef: pageDef, pageMax: pageMax,
	}
}

func (c *CatalogController) allow(r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	return c.limiter.Allow(scope+":"+actor.UserID.String(), c.limit, c.window)
}

// @Summary		Event catalog
// @Description	Every published, non-archived event regardless of participation. The response
// @Description	carries a dedicated payload that cannot include administrative notes.
// @Description
// @Description	The catalog requires a session: an anonymous request is answered with 401. An
// @Description	unauthenticated listing would enumerate every event of the organisation together
// @Description	with its organisers and prize pools, and the system is internal. It also carries
// @Description	its own rate limit, counted per account, because a catalog page is heavier than
// @Description	other reads: substring search, filters and the stages of the page.
// @Tags			catalog
// @Produce		json
// @Security		CookieAuth
// @Param			search		query		string	false	"Search by title and organiser"
// @Param			origin		query		string	false	"Comma-separated origin filter. Omit it for the All view: RU and WORLD cover every event."																Enums(RU,WORLD)
// @Param			format		query		string	false	"Comma-separated format filter. OFFLINE and HYBRID also match an event whose own format is ONLINE when at least one of its stages is held in person."	Enums(ONLINE,OFFLINE,HYBRID)
// @Param			kind		query		string	false	"Comma-separated kind filter"																															Enums(HACKATHON,MEETUP)
// @Param			state		query		string	false	"Comma-separated state filter"																															Enums(UPCOMING,ACTIVE,FINISHED)
// @Param			from		query		string	false	"Lower bound of the period"																																format(date-time)
// @Param			to			query		string	false	"Upper bound of the period"																																format(date-time)
// @Param			page		query		int		false	"Page number"																																			default(1)
// @Param			page_size	query		int		false	"Page size"																																				default(50)
// @Success		200			{object}	models.CatalogPage
// @Failure		400			{object}	models.ErrorResponse
// @Failure		401			{object}	models.ErrorResponse
// @Failure		429			{object}	models.ErrorResponse	"too many catalog requests"
// @Router			/catalog [get]
func (c *CatalogController) List(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "catalog.list") {
		httpx.Error(w, r, models.NewRateLimited("too many catalog requests"))
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
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

	filter := models.CatalogFilter{
		Search:  httpx.QueryTrimmed(r, "search"),
		Origins: parseOrigins(httpx.QueryTrimmed(r, "origin")),
		Formats: parseFormats(httpx.QueryTrimmed(r, "format")),
		Kinds:   parseKinds(httpx.QueryTrimmed(r, "kind")),
		States:  parseStates(httpx.QueryTrimmed(r, "state")),
		From:    from,
		To:      to,
	}
	items, total, err := c.catalog.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.CatalogPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Join an event
// @Description	Self-signup: the user joins a published event and supplies their own team role.
// @Description	A meetup has no team role, so the field may be omitted; for a hackathon it is
// @Description	required. A finished event cannot be joined: only an administrator may assign a
// @Description	participant after the fact.
// @Tags			catalog
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Event identifier"	format(uuid)
// @Param			request	body		models.JoinEventRequest	true	"Own team role"
// @Success		201		{object}	models.ParticipantSelfResponse
// @Failure		400		{object}	models.ErrorResponse	"a hackathon requires a team role"
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"already a participant, or the event has finished"
// @Failure		429		{object}	models.ErrorResponse	"too many join attempts"
// @Router			/events/{id}/join [post]
func (c *CatalogController) Join(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "catalog.join") {
		httpx.Error(w, r, models.NewRateLimited("too many join attempts"))
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.JoinEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	p, err := c.catalog.Join(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, models.ParticipantSelfResponse{
		ID:                  p.ID,
		EventID:             p.EventID,
		TeamRole:            p.TeamRole,
		ParticipationStatus: p.ParticipationStatus,
		AssignedAt:          p.AssignedAt,
	})
}

func parseOrigins(raw string) []models.EventOrigin {
	out := make([]models.EventOrigin, 0, 2)
	for _, p := range splitUpper(raw) {
		out = append(out, models.EventOrigin(p))
	}
	return out
}

func parseFormats(raw string) []models.EventFormat {
	out := make([]models.EventFormat, 0, 3)
	for _, p := range splitUpper(raw) {
		out = append(out, models.EventFormat(p))
	}
	return out
}

func parseKinds(raw string) []models.EventKind {
	out := make([]models.EventKind, 0, 2)
	for _, p := range splitUpper(raw) {
		out = append(out, models.EventKind(p))
	}
	return out
}

func splitUpper(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(strings.ToUpper(p)); p != "" {
			out = append(out, p)
		}
	}
	return out
}
