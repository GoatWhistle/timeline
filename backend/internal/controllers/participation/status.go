package participation

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type RegistrationStatusController struct {
	statuses StatusService
	pageDef  int
	pageMax  int
}

func NewRegistrationStatusController(st StatusService, pageDef, pageMax int) *RegistrationStatusController {
	return &RegistrationStatusController{statuses: st, pageDef: pageDef, pageMax: pageMax}
}

type StatusService interface {
	ResolveStatusDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, page models.Page,
	) ([]models.RegistrationStatusResponse, int64, error)
	MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.RegistrationStatusResponse, error)
	AdminChange(
		ctx context.Context, actor models.Actor, statusID uuid.UUID, req models.AdminChangeStatusRequest,
	) (*models.RegistrationStatusResponse, error)
	BatchSet(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.BatchSetStatusRequest,
	) (*models.BatchResult, error)
	BatchSetPreview(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.BatchSetStatusRequest,
	) (*models.PreviewResponse, error)
}

// @Summary	Participant registration statuses
// @Tags		registration
// @Produce	json
// @Security	CookieAuth
// @Param		id			path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param		page		query		int		false	"Page number"		default(1)
// @Param		page_size	query		int		false	"Page size"			default(50)
// @Success	200			{object}	models.RegistrationStatusPage
// @Failure	403			{object}	models.ErrorResponse
// @Failure	404			{object}	models.ErrorResponse
// @Router		/admin/events/{id}/registration-statuses [get]
func (c *RegistrationStatusController) ListStatuses(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.statuses.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.statuses.List(r.Context(), middleware.ActorFrom(r), id, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.RegistrationStatusPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Mark registration as completed
// @Description	Participant self-report: moves their own TODO status to DONE. Available with an active
// @Description	registration, an assigned participation and a non-archived event. The system does not verify the external site.
// @Tags			registration
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	models.RegistrationStatusResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"invalid state transition"
// @Router			/events/{id}/registration/done [post]
func (c *RegistrationStatusController) MarkDone(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.statuses.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.MarkDone(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// @Summary		Administrative status transition
// @Description	Allowed transitions: TODO to DONE, DONE to TODO, TODO/DONE to NOT_REQUIRED,
// @Description	NOT_REQUIRED to TODO. Entering TODO increments todo_cycle and clears registered_at.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Status identifier"	example(rs_42ej2s5gh7)
// @Param			request	body		models.AdminChangeStatusRequest	true	"New status"
// @Success		200		{object}	models.RegistrationStatusResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse
// @Router			/admin/registration-statuses/{id} [patch]
func (c *RegistrationStatusController) AdminChangeStatus(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindRegistrationStatus, c.statuses.ResolveStatusDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.AdminChangeStatusRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.AdminChange(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// @Summary		Bulk status assignment
// @Description	Only TODO and NOT_REQUIRED are accepted. The result is returned per participant.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		models.BatchSetStatusRequest	true	"Participants and target status"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/registration-statuses/batch-set [post]
func (c *RegistrationStatusController) BatchSetStatus(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSet(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// @Summary		Preview a bulk status assignment
// @Description	Returns the number of records to be changed and skipped without modifying data.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		models.BatchSetStatusRequest	true	"Participants and target status"
// @Success		200		{object}	models.PreviewResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/registration-statuses/batch-set/preview [post]
func (c *RegistrationStatusController) BatchSetStatusPreview(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSetPreview(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

func (c *RegistrationStatusController) batchInput(w http.ResponseWriter, r *http.Request,
) (id uuid.UUID, req models.BatchSetStatusRequest, ok bool) {
	parsed, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.statuses.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	return parsed, req, true
}
