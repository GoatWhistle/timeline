package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Your own keyboard shortcut overrides
// @Description	The map binds an action identifier to a shortcut. An action missing from the map keeps its default.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.ShortcutsResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/shortcuts [get]
func (c *ProfileController) Shortcuts(w http.ResponseWriter, r *http.Request) {
	user, err := c.svc.Get(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ShortcutsResponse{Shortcuts: shared.Shortcuts(user.Shortcuts)})
}

// @Summary		Replace your own keyboard shortcut overrides
// @Description	The whole map is replaced. Two actions may not claim the same shortcut,
// @Description	and shortcuts owned by the browser or the operating system are refused.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.UpdateShortcutsRequest	true	"Action to shortcut map"
// @Success		200		{object}	dto.ShortcutsResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"the shortcut is taken or reserved"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me/shortcuts [put]
func (c *ProfileController) UpdateShortcuts(w http.ResponseWriter, r *http.Request) {
	if !c.allowShortcuts(r) {
		httpx.Error(w, r, models.NewRateLimited("too many shortcut updates, try again later"))
		return
	}
	var req dto.UpdateShortcutsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, err := c.svc.UpdateShortcuts(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ShortcutsResponse{Shortcuts: shared.Shortcuts(user.Shortcuts)})
}

// @Summary	Reset every keyboard shortcut to its default
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	dto.ShortcutsResponse
// @Failure	401	{object}	dto.ErrorResponse
// @Failure	429	{object}	dto.ErrorResponse
// @Router		/me/shortcuts [delete]
func (c *ProfileController) ResetShortcuts(w http.ResponseWriter, r *http.Request) {
	if !c.allowShortcuts(r) {
		httpx.Error(w, r, models.NewRateLimited("too many shortcut updates, try again later"))
		return
	}
	user, err := c.svc.ResetShortcuts(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ShortcutsResponse{Shortcuts: shared.Shortcuts(user.Shortcuts)})
}
