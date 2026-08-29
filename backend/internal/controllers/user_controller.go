package controllers

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type UserService interface {
	Search(ctx context.Context, actor models.Actor, query string, page models.Page) ([]models.UserSummary, int64, error)
	SetActive(ctx context.Context, actor models.Actor, userID uuid.UUID, active bool) error
	Delete(ctx context.Context, actor models.Actor, userID uuid.UUID) error
}

type UserController struct {
	svc      UserService
	pageSize int
	pageMax  int
}

func NewUserController(svc UserService, pageSize, pageMax int) *UserController {
	return &UserController{svc: svc, pageSize: pageSize, pageMax: pageMax}
}

// @Summary		Search users
// @Description	Search by display_name and normalised email to pick participants.
// @Description	Only minimal fields are returned; credentials and channel data are withheld.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			query		query		string	false	"Search string"
// @Param			page		query		int		false	"Page number"	default(1)
// @Param			page_size	query		int		false	"Page size"		default(50)
// @Success		200			{object}	models.UserPage
// @Failure		403			{object}	models.ErrorResponse
// @Router			/admin/users [get]
func (c *UserController) Search(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageSize, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.Search(r.Context(), middleware.ActorFrom(r), httpx.QueryTrimmed(r, "query"), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.UserPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Deactivate a user
// @Description	Revokes sessions, removes the Telegram link and moves pending notifications to CANCELLED.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	format(uuid)
// @Success		200	{object}	models.MessageResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/admin/users/{id}/deactivate [post]
func (c *UserController) Deactivate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, false)
}

// @Summary		Reactivate a user
// @Description	Restores access. Previously cancelled notifications are not revived.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	format(uuid)
// @Success		200	{object}	models.MessageResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/admin/users/{id}/activate [post]
func (c *UserController) Activate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, true)
}

func (c *UserController) setActive(w http.ResponseWriter, r *http.Request, active bool) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.SetActive(r.Context(), middleware.ActorFrom(r), id, active); err != nil {
		httpx.Error(w, r, err)
		return
	}
	msg := "the account is deactivated"
	if active {
		msg = "the account has been activated"
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: msg})
}

// @Summary		Irreversible user deletion
// @Description	Removes credentials and delivery channels, anonymises the name and email.
// @Description	Participation references and audit entries are preserved.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	format(uuid)
// @Success		200	{object}	models.MessageResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/admin/users/{id} [delete]
func (c *UserController) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "the account has been deleted and anonymised"})
}
