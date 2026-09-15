package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type UserService interface {
	ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	SearchForAdmin(ctx context.Context, actor models.Actor, filter models.UserFilter,
		page models.Page) ([]dto.AdminUserSummary, int64, error)
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
// @Description	Administrative directory: search by name, nickname, address and Telegram handle,
// @Description	with filters and sorting. Credentials and the Telegram chat identifier are withheld.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			query		query		string	false	"Search string"
// @Param			active		query		bool	false	"Only active or only deactivated accounts"
// @Param			admin		query		bool	false	"Only administrators or only ordinary accounts"
// @Param			telegram	query		bool	false	"Only accounts with or without a Telegram handle"
// @Param			sort		query		string	false	"Sort field"		Enums(name,email,created_at)
// @Param			order		query		string	false	"Sort direction"	Enums(asc,desc)
// @Param			page		query		int		false	"Page number"		default(1)
// @Param			page_size	query		int		false	"Page size"			default(50)
// @Success		200			{object}	dto.AdminUserPage
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Router			/admin/users [get]
func (c *UserController) Search(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageSize, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter, err := parseUserFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.SearchForAdmin(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.AdminUserPage{Items: items, Meta: httpx.Meta(page, total)})
}

var userSortFields = map[string]models.UserSortField{
	"":           models.UserSortName,
	"name":       models.UserSortName,
	"email":      models.UserSortEmail,
	"created_at": models.UserSortCreated,
}

func parseUserFilter(r *http.Request) (models.UserFilter, error) {
	active, err := httpx.QueryTriBool(r, "active")
	if err != nil {
		return models.UserFilter{}, err
	}
	admin, err := httpx.QueryTriBool(r, "admin")
	if err != nil {
		return models.UserFilter{}, err
	}
	telegram, err := httpx.QueryTriBool(r, "telegram")
	if err != nil {
		return models.UserFilter{}, err
	}
	sort, ok := userSortFields[strings.ToLower(httpx.QueryTrimmed(r, "sort"))]
	if !ok {
		return models.UserFilter{}, models.NewValidationf("unknown sort field %q",
			httpx.QueryTrimmed(r, "sort"))
	}
	direction, err := models.ParseCatalogSortDirection(
		strings.ToLower(httpx.QueryTrimmed(r, "order")))
	if err != nil {
		return models.UserFilter{}, err
	}
	return models.UserFilter{
		Query:     httpx.QueryTrimmed(r, "query"),
		Active:    active,
		Admin:     admin,
		Telegram:  telegram,
		Sort:      sort,
		Direction: direction,
	}, nil
}

// @Summary		Deactivate a user
// @Description	Revokes sessions, removes the Telegram link and moves pending notifications to CANCELLED.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200	{object}	dto.MessageResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/users/{id}/deactivate [post]
func (c *UserController) Deactivate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, false)
}

// @Summary		Reactivate a user
// @Description	Restores access. Previously cancelled notifications are not revived.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200	{object}	dto.MessageResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/users/{id}/activate [post]
func (c *UserController) Activate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, true)
}

func (c *UserController) setActive(w http.ResponseWriter, r *http.Request, active bool) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
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
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: msg})
}

// @Summary		Irreversible user deletion
// @Description	Removes credentials and delivery channels, anonymises the name and email.
// @Description	Participation references and audit entries are preserved.
// @Tags			users
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200	{object}	dto.MessageResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/users/{id} [delete]
func (c *UserController) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "the account has been deleted and anonymised"})
}
