package event

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type ResourceLinkService interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveStageDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveLinkDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolvePersonalLinkDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.ResourceLink, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateResourceLinkRequest,
		stageID *uuid.UUID,
	) (*models.ResourceLink, error)
	Update(
		ctx context.Context, actor models.Actor, eventID, linkID uuid.UUID, req dto.UpdateResourceLinkRequest,
		stageID *uuid.UUID,
	) (*models.ResourceLink, error)
	Delete(ctx context.Context, actor models.Actor, eventID, linkID uuid.UUID) error
	ListPersonal(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.ParticipantLink, error)
	CreatePersonal(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateParticipantLinkRequest,
	) (*models.ParticipantLink, error)
	UpdatePersonal(
		ctx context.Context, actor models.Actor, linkID uuid.UUID, req dto.UpdateParticipantLinkRequest,
	) (*models.ParticipantLink, error)
	DeletePersonal(ctx context.Context, actor models.Actor, linkID uuid.UUID) error
}

type ResourceLinkController struct {
	links   ResourceLinkService
	limiter shared.Limiter
	limit   int
	window  time.Duration
}

func NewResourceLinkController(svc ResourceLinkService, limiter shared.Limiter, limit int,
	window time.Duration) *ResourceLinkController {
	return &ResourceLinkController{links: svc, limiter: limiter, limit: limit, window: window}
}

func (c *ResourceLinkController) guard(w http.ResponseWriter, r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	if c.limiter.Allow(scope+":"+actor.UserID.String(), c.limit, c.window) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many resource link requests"))
	return false
}

// @Summary		Resource links of an event
// @Description	Every link attached to the event: rules, chat, submission form, dataset,
// @Description	judging criteria and the rest. Pinned links come first, then the explicit
// @Description	sort order.
// @Description
// @Description	A link carrying stage_id belongs to that stage and is meant to surface while
// @Description	the stage runs rather than for the whole event. The system never follows a
// @Description	link: no title, favicon or availability is fetched from the address, so an
// @Description	address supplied here can never make the server call out (plan IVa.4).
// @Description
// @Description	The scheme is not restricted to HTTPS (specification 5.1): a plain http
// @Description	address, an internal host or a tg:// address is stored as given. The scheme
// @Description	must be on the accepted list: http, https, ftp, ftps, mailto, tel, tg,
// @Description	matrix, webcal, irc, ircs and xmpp. Anything else is rejected, so a scheme
// @Description	that executes in the browser or hands the address to an operating system
// @Description	handler can never be stored. The client marks a non-HTTPS link but never
// @Description	blocks it.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.ResourceLinkListResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse	"the event is not visible to the caller"
// @Failure		429	{object}	dto.ErrorResponse
// @Router			/events/{id}/links [get]
func (c *ResourceLinkController) List(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.list") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.links.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ResourceLinkListResponse{Items: items})
}

// @Summary		Add a resource link
// @Description	Attaches a link to the event or, when stage_id is given, to one of its stages.
// @Description	A stage belonging to another event is rejected: the composite foreign key
// @Description	(stage_id, event_id) makes the mismatch impossible to store.
// @Description
// @Description	The canonical registration address stays in Registration.url because it takes
// @Description	part in notification content versioning (specification 7); a REGISTRATION link
// @Description	here only displays that same value.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.CreateResourceLinkRequest	true	"Link"
// @Success		201		{object}	models.ResourceLink
// @Failure		400		{object}	dto.ErrorResponse	"bad address, executable scheme or a foreign stage"
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse	"only an administrator edits event links"
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"the link limit for the event is reached"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/events/{id}/links [post]
func (c *ResourceLinkController) Create(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.create") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CreateResourceLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	stageID, err := httpx.BodyDisplayID(r.Context(), req.StageID,
		dto.DisplayKindStage, c.links.ResolveStageDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.links.Create(r.Context(), middleware.ActorFrom(r), id, req, stageID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, link)
}

// @Summary		Change a resource link
// @Description	Edits one link of the event. Moving a link to a stage of another event is
// @Description	rejected the same way as on creation.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			linkId	path		string							true	"Link identifier"	example(rl_42ej2s5gh7e8)
// @Param			request	body		dto.UpdateResourceLinkRequest	true	"Fields to change"
// @Success		200		{object}	models.ResourceLink
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/events/{id}/links/{linkId} [patch]
func (c *ResourceLinkController) Update(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.update") {
		return
	}
	eventID, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	linkID, err := httpx.PathDisplayID(r, "linkId", dto.DisplayKindResourceLink, c.links.ResolveLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateResourceLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	stageID, err := httpx.BodyDisplayID(r.Context(), req.StageID,
		dto.DisplayKindStage, c.links.ResolveStageDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.links.Update(r.Context(), middleware.ActorFrom(r), eventID, linkID, req, stageID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, link)
}

// @Summary		Remove a resource link
// @Description	Deletes one link of the event. The action is recorded in the audit log.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id		path	string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			linkId	path	string	true	"Link identifier"	example(rl_42ej2s5gh7e8)
// @Success		204		"the link is removed"
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/events/{id}/links/{linkId} [delete]
func (c *ResourceLinkController) Delete(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.delete") {
		return
	}
	eventID, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	linkID, err := httpx.PathDisplayID(r, "linkId", dto.DisplayKindResourceLink, c.links.ResolveLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.links.Delete(r.Context(), middleware.ActorFrom(r), eventID, linkID); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
