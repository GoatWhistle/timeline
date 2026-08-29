package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
)

type ProfileLinkService interface {
	List(ctx context.Context, userID uuid.UUID) ([]models.ProfileLink, error)
	Create(ctx context.Context, actor models.Actor,
		req models.CreateProfileLinkRequest) (*models.ProfileLink, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID,
		req models.UpdateProfileLinkRequest) (*models.ProfileLink, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Reorder(ctx context.Context, actor models.Actor,
		req models.ReorderProfileLinksRequest, ids []uuid.UUID) ([]models.ProfileLink, error)
}

type ProfileLinkController struct {
	svc     ProfileLinkService
	limiter shared.Limiter
	limit   int
	window  time.Duration
}

func NewProfileLinkController(svc ProfileLinkService, limiter shared.Limiter,
	limit int, window time.Duration) *ProfileLinkController {
	return &ProfileLinkController{svc: svc, limiter: limiter, limit: limit, window: window}
}

func (c *ProfileLinkController) guard(w http.ResponseWriter, r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	if c.limiter.Allow(scope+":"+actor.UserID.String(), c.limit, c.window) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many profile link requests"))
	return false
}

// @Summary		Your own profile links
// @Description	The links shown on the profile, in their display order. The kind of each link
// @Description	is not stored: the client derives it from the address, so a new service needs
// @Description	no migration.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.ProfileLinkListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/profile-links [get]
func (c *ProfileLinkController) List(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "profile.links.list") {
		return
	}
	items, err := c.svc.List(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.ProfileLinkListResponse{Items: items})
}

// @Summary		Add a profile link
// @Description	Appends a link to the end of the list. The address must parse and use http or
// @Description	https; schemes that execute in the browser are rejected. The number of links
// @Description	per profile is bounded.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.CreateProfileLinkRequest	true	"Link"
// @Success		201		{object}	models.ProfileLink
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the profile link limit is reached"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/profile-links [post]
func (c *ProfileLinkController) Create(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "profile.links.create") {
		return
	}
	var req models.CreateProfileLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.svc.Create(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, link)
}

// @Summary	Change a profile link
// @Tags		profile
// @Accept		json
// @Produce	json
// @Security	CookieAuth
// @Param		id		path		string							true	"Link identifier"	example(pf_42ej2s5gh7e8)
// @Param		request	body		models.UpdateProfileLinkRequest	true	"Changed fields"
// @Success	200		{object}	models.ProfileLink
// @Failure	400		{object}	models.ErrorResponse
// @Failure	401		{object}	models.ErrorResponse
// @Failure	404		{object}	models.ErrorResponse
// @Failure	429		{object}	models.ErrorResponse
// @Router		/me/profile-links/{id} [patch]
func (c *ProfileLinkController) Update(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "profile.links.update") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindProfileLink, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateProfileLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.svc.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, link)
}

// @Summary	Remove a profile link
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Link identifier"	example(pf_42ej2s5gh7e8)
// @Success	200	{object}	models.MessageResponse
// @Failure	401	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Failure	429	{object}	models.ErrorResponse
// @Router		/me/profile-links/{id} [delete]
func (c *ProfileLinkController) Delete(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "profile.links.delete") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindProfileLink, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "the link is removed"})
}

// @Summary		Reorder the profile links
// @Description	Takes every link identifier of the profile exactly once, in the wanted order.
// @Description	A partial list is rejected, so a reorder cannot silently drop a link.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.ReorderProfileLinksRequest	true	"Identifiers in display order"
// @Success		200		{object}	models.ProfileLinkListResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/profile-links/order [put]
func (c *ProfileLinkController) Reorder(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "profile.links.reorder") {
		return
	}
	var req models.ReorderProfileLinksRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ids, err := httpx.BodyDisplayIDs(r.Context(), req.IDs,
		models.DisplayKindProfileLink, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.svc.Reorder(r.Context(), middleware.ActorFrom(r), req, ids)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.ProfileLinkListResponse{Items: items})
}
