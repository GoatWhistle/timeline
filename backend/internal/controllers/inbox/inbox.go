package inbox

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Service interface {
	List(ctx context.Context, actor models.Actor, unreadOnly bool, page models.Page,
	) ([]dto.InboxItemResponse, int64, error)
	UnreadCount(ctx context.Context, actor models.Actor) (int64, error)
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	MarkRead(ctx context.Context, actor models.Actor, ids []uuid.UUID) (int64, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
	DeleteAll(ctx context.Context, actor models.Actor, readOnly bool) (int64, error)
	Restore(ctx context.Context, actor models.Actor, id uuid.UUID) (dto.InboxItemResponse, error)
	MarkRegistered(ctx context.Context, actor models.Actor, id uuid.UUID) error
}

type Controller struct {
	svc     Service
	pageDef int
	pageMax int
}

func NewController(svc Service, pageDef, pageMax int) *Controller {
	return &Controller{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// @Summary		Own inbox
// @Description	The notification center: a titled, Markdown-bodied entry for every situation that
// @Description	also reached email or Telegram, plus personal system events. Soft-deleted items are
// @Description	excluded.
// @Tags			inbox
// @Produce		json
// @Security		CookieAuth
// @Param			unread		query		bool	false	"Return only unread entries"
// @Param			page		query		int		false	"Page number, from 1"
// @Param			page_size	query		int		false	"Page size"
// @Success		200			{object}	dto.InboxPage
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Router			/me/inbox [get]
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	unread, err := httpx.QueryBool(r, "unread")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.List(r.Context(), actor, unread, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.InboxPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary	Unread inbox count
// @Tags		inbox
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	dto.UnreadCountResponse
// @Failure	401	{object}	dto.ErrorResponse
// @Router		/me/inbox/unread-count [get]
func (c *Controller) UnreadCount(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	count, err := c.svc.UnreadCount(r.Context(), actor)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.UnreadCountResponse{Unread: count})
}

// @Summary		Mark inbox items read
// @Description	Marks the listed items read for the caller. An empty list marks the whole inbox.
// @Tags			inbox
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.InboxMarkReadRequest	true	"Identifiers to mark, empty for all"
// @Success		200		{object}	dto.UnreadCountResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Router			/me/inbox/read [post]
func (c *Controller) MarkRead(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	var req dto.InboxMarkReadRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ids, err := httpx.BodyDisplayIDs(r.Context(), req.IDs, dto.DisplayKindInboxItem, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if _, err := c.svc.MarkRead(r.Context(), actor, ids); err != nil {
		httpx.Error(w, r, err)
		return
	}
	count, err := c.svc.UnreadCount(r.Context(), actor)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.UnreadCountResponse{Unread: count})
}

// @Summary		Delete one inbox item
// @Description	Soft delete: the item stops appearing in the list and can be brought back with restore.
// @Tags			inbox
// @Security		CookieAuth
// @Param			id	path	string	true	"Inbox item identifier"
// @Success		204
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/me/inbox/{id} [delete]
func (c *Controller) Delete(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindInboxItem, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Delete(r.Context(), actor, id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary		Delete the whole inbox
// @Description	Soft delete of every visible item. With read_only=true only already-read items go.
// @Tags			inbox
// @Security		CookieAuth
// @Param			read_only	query		bool	false	"Delete only items already marked read"
// @Success		200			{object}	dto.MessageResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Router			/me/inbox [delete]
func (c *Controller) DeleteAll(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	readOnly, err := httpx.QueryBool(r, "read_only")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if _, err := c.svc.DeleteAll(r.Context(), actor, readOnly); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "inbox cleared"})
}

// @Summary	Restore a deleted inbox item
// @Tags		inbox
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Inbox item identifier"
// @Success	200	{object}	dto.InboxItemResponse
// @Failure	401	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Router		/me/inbox/{id}/restore [post]
func (c *Controller) Restore(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindInboxItem, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	item, err := c.svc.Restore(r.Context(), actor, id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

// @Summary		Mark the linked registration done from an inbox item
// @Description	The same idempotent action as the Telegram "I registered" button.
// @Tags			inbox
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Inbox item identifier"
// @Success		204
// @Failure		400	{object}	dto.ErrorResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/me/inbox/{id}/mark-registered [post]
func (c *Controller) MarkRegistered(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindInboxItem, c.svc.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.MarkRegistered(r.Context(), actor, id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
