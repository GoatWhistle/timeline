package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type InviteService interface {
	ResolveInviteDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Create(ctx context.Context, actor models.Actor, email string) (*models.Invite, string, error)
	List(ctx context.Context, actor models.Actor, page models.Page) ([]models.Invite, int64, error)
	Revoke(ctx context.Context, actor models.Actor, id uuid.UUID) error
	Preview(ctx context.Context, token string) (*dto.InvitePreview, error)
	Accept(
		ctx context.Context, req dto.AcceptInviteRequest, meta models.SessionMeta,
	) (*models.User, *models.TokenPair, error)
}

type InviteController struct {
	svc       InviteService
	cookies   httpsession.CookieOptions
	publicURL string
	csrfTTL   time.Duration
	pageDef   int
	pageMax   int
}

func NewInviteController(svc InviteService, cookies httpsession.CookieOptions, publicURL string,
	csrfTTL time.Duration, pageDef, pageMax int,
) *InviteController {
	return &InviteController{
		svc: svc, cookies: cookies, publicURL: publicURL,
		csrfTTL: csrfTTL, pageDef: pageDef, pageMax: pageMax,
	}
}

// @Summary		Create an invite
// @Description	Creation is serialised by normalised email: a previous unaccepted invite is revoked,
// @Description	then a new one is created. An invite for an existing user address is rejected with a conflict
// @Description	regardless of that user's activity.
// @Tags			invites
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.CreateInviteRequest	true	"Address of the invited person"
// @Success		201		{object}	dto.CreateInviteResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"a user with this email already exists"
// @Router			/admin/invites [post]
func (c *InviteController) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateInviteRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	invite, token, err := c.svc.Create(r.Context(), middleware.ActorFrom(r), req.Email)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, dto.CreateInviteResponse{
		Invite:     presenter.InviteResponse(invite),
		AcceptLink: c.publicURL + "/invite/" + token,
	})
}

// @Summary	Invite list
// @Tags		invites
// @Produce	json
// @Security	CookieAuth
// @Param		page		query		int	false	"Page number"	default(1)
// @Param		page_size	query		int	false	"Page size"		default(50)
// @Success	200			{object}	dto.InvitePage
// @Failure	403			{object}	dto.ErrorResponse
// @Router		/admin/invites [get]
func (c *InviteController) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.List(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]dto.InviteResponse, 0, len(items))
	for i := range items {
		out = append(out, presenter.InviteResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, dto.InvitePage{Items: out, Meta: httpx.Meta(page, total)})
}

// @Summary	Revoke an invite
// @Tags		invites
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Invite identifier"	example(in_42ej2s5gh7e8)
// @Success	200	{object}	dto.MessageResponse
// @Failure	403	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Router		/admin/invites/{id}/revoke [post]
func (c *InviteController) Revoke(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindInvite, c.svc.ResolveInviteDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Revoke(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "invite revoked"})
}

// @Summary		Public invite preview
// @Description	Returns the address and expiry of the invite without disclosing any other data.
// @Tags			invites
// @Produce		json
// @Param			token	path		string	true	"Invite token"
// @Success		200		{object}	dto.InvitePreview
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/invites/{token} [get]
func (c *InviteController) Preview(w http.ResponseWriter, r *http.Request) {
	preview, err := c.svc.Preview(r.Context(), r.PathValue("token"))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, preview)
}

// @Summary		Accept an invite
// @Description	Creates an account for the invited address and opens a session.
// @Description	Any other unexpired invites for this address are revoked in the same transaction.
// @Tags			invites
// @Accept			json
// @Produce		json
// @Param			request	body		dto.AcceptInviteRequest	true	"Token and account data"
// @Success		200		{object}	dto.AuthResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/invites/accept [post]
func (c *InviteController) Accept(w http.ResponseWriter, r *http.Request) {
	var req dto.AcceptInviteRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	meta := sessionMeta(r)
	user, pair, err := c.svc.Accept(r.Context(), req, meta)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.SetAuth(w, pair)
	c.cookies.SetDevice(w, meta.DeviceID, time.Now())
	c.cookies.SetCSRF(w, randomToken(), time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, dto.AuthResponse{
		User:             presenter.MeResponse(user),
		AccessExpiresAt:  pair.AccessExpiresAt,
		RefreshExpiresAt: pair.RefreshExpiresAt,
	})
}
