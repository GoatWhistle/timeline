package finance

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Controller struct {
	finance FinanceService
	cases   CaseService
}

func NewController(f FinanceService, c CaseService) *Controller {
	return &Controller{finance: f, cases: c}
}

func (c *Controller) eventID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindEvent, c.finance.ResolveDisplayID)
}

func (c *Controller) caseID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindEventCase, c.cases.ResolveDisplayID)
}

// @Summary		Event finance
// @Description	Every sum the event declares, reconciled in one place: the prize pool, the split
// @Description	across tracks with their places and nominations, the partner cases and what the
// @Description	three add up to.
// @Description
// @Description	`distributed` is `distributed_tracks` plus `distributed_cases`, and `discrepancy`
// @Description	is `prize_pool` minus that sum. A positive discrepancy is a reserve, a negative one
// @Description	is an overspend. Neither is an error and neither blocks saving the event: the
// @Description	organiser may announce a pool larger than the prizes, or a sponsor may add to it
// @Description	later. When the event declares no pool, `discrepancy_known` is false and no
// @Description	discrepancy is reported rather than a zero being invented.
// @Description
// @Description	Access follows the track listing: an unpublished event answers only to an
// @Description	administrator, a published one to any reader.
// @Tags			finance
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventFinanceResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id}/finance [get]
func (c *Controller) Summary(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.finance.Summary(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Event cases
// @Description	The partner tasks declared for the event, in `case_no` order. A case may belong to
// @Description	a track or to the event as a whole, and may carry a prize or none at all.
// @Description	Access follows the track listing.
// @Tags			finance
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventCaseListResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id}/cases [get]
func (c *Controller) ListCases(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.cases.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a case
// @Description	Only the name is required: a case without a track belongs to the event as a whole,
// @Description	and a case without a prize is a research task rather than a funded one. A prize is
// @Description	a whole number in the event currency, the same units track prizes use.
// @Tags			finance
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"
// @Param			request	body		dto.CreateEventCaseRequest	true	"Case payload"
// @Success		201		{object}	dto.EventCaseResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/cases [post]
func (c *Controller) CreateCase(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CreateEventCaseRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.cases.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, out)
}

// @Summary		Update a case
// @Description	Omitted fields are left as they are. Detaching a case from its track needs
// @Description	clear_track, and dropping its prize needs clear_prize: a null is indistinguishable
// @Description	from an absent field otherwise.
// @Tags			finance
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Case identifier"
// @Param			request	body		dto.UpdateEventCaseRequest	true	"Mutable fields"
// @Success		200		{object}	dto.EventCaseResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/cases/{id} [patch]
func (c *Controller) UpdateCase(w http.ResponseWriter, r *http.Request) {
	id, err := c.caseID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateEventCaseRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.cases.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Delete a case
// @Description	The case and its prize leave the reconciliation; the track it pointed at is
// @Description	untouched.
// @Tags			finance
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Case identifier"	example(cs_42ej2s5gh7e8)
// @Success		204	"the case is deleted"
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/cases/{id} [delete]
func (c *Controller) DeleteCase(w http.ResponseWriter, r *http.Request) {
	id, err := c.caseID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.cases.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
