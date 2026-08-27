package controllers

import (
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type InviteController struct {
	svc       InviteService
	cookies   CookieOptions
	publicURL string
	csrfTTL   time.Duration
	pageDef   int
	pageMax   int
}

func NewInviteController(svc InviteService, cookies CookieOptions, publicURL string, csrfTTL time.Duration, pageDef, pageMax int) *InviteController {
	return &InviteController{svc: svc, cookies: cookies, publicURL: publicURL, csrfTTL: csrfTTL, pageDef: pageDef, pageMax: pageMax}
}

// @Summary		Create an invite
// @Description	Creation is serialised by normalised email: a previous unaccepted invite is revoked,
// @Description	then a new one is created. An invite for an existing user address is rejected with a conflict
// @Description	regardless of that user's activity.
// @Tags			invites
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.CreateInviteRequest	true	"Address of the invited person"
// @Success		201		{object}	models.CreateInviteResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"a user with this email already exists"
// @Router			/admin/invites [post]
func (c *InviteController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateInviteRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	invite, token, err := c.svc.Create(r.Context(), middleware.ActorFrom(r), req.Email)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, models.CreateInviteResponse{
		Invite:     inviteResponse(invite),
		AcceptLink: c.publicURL + "/invite/" + token,
	})
}

// @Summary	Invite list
// @Tags		invites
// @Produce	json
// @Security	CookieAuth
// @Param		page		query		int	false	"Page number"	default(1)
// @Param		page_size	query		int	false	"Page size"	default(50)
// @Success	200			{object}	models.InvitePage
// @Failure	403			{object}	models.ErrorResponse
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
	out := make([]models.InviteResponse, 0, len(items))
	for i := range items {
		out = append(out, inviteResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, models.InvitePage{Items: out, Meta: httpx.Meta(page, total)})
}

// @Summary	Revoke an invite
// @Tags		invites
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Invite identifier"	format(uuid)
// @Success	200	{object}	models.MessageResponse
// @Failure	403	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Router		/admin/invites/{id}/revoke [post]
func (c *InviteController) Revoke(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Revoke(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "invite revoked"})
}

// @Summary		Public invite preview
// @Description	Returns the address and expiry of the invite without disclosing any other data.
// @Tags			invites
// @Produce		json
// @Param			token	path		string	true	"Invite token"
// @Success		200		{object}	models.InvitePreview
// @Failure		404		{object}	models.ErrorResponse
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
// @Param			request	body		models.AcceptInviteRequest	true	"Token and account data"
// @Success		200		{object}	models.AuthResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse
// @Router			/invites/accept [post]
func (c *InviteController) Accept(w http.ResponseWriter, r *http.Request) {
	var req models.AcceptInviteRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, pair, err := c.svc.Accept(r.Context(), req, sessionMeta(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.SetAuth(w, pair)
	c.cookies.SetCSRF(w, randomToken(), time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, models.AuthResponse{
		User:             meResponse(user),
		AccessExpiresAt:  pair.AccessExpiresAt,
		RefreshExpiresAt: pair.RefreshExpiresAt,
	})
}
