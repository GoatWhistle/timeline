package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Confirm an email change
// @Description	Promotes pending_email to the primary address. Until confirmation, sign-in uses the previous address.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.TokenRequest	true	"Confirmation token"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"address is already taken"
// @Router			/auth/email-change/confirm [post]
func (c *Controller) ConfirmEmailChange(w http.ResponseWriter, r *http.Request) {
	var req dto.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ConfirmEmailChange(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "email updated"})
}

// @Summary		Cancel an email change
// @Description	Reverts the account to the address the change was requested from. Works both before and
// @Description	after the new address has been confirmed, for as long as the cancellation link is valid.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.TokenRequest	true	"Cancellation token"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Router			/auth/email-change/cancel [post]
func (c *Controller) CancelEmailChange(w http.ResponseWriter, r *http.Request) {
	var req dto.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.CancelEmailChange(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "email change cancelled"})
}
