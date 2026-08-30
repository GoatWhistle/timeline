package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type PublicProfileService interface {
	PublicProfile(ctx context.Context, nickname string) (dto.PublicProfileResponse, error)
}

type PublicProfileController struct {
	svc     PublicProfileService
	limiter shared.Limiter
	limit   int
	window  time.Duration
}

func NewPublicProfileController(svc PublicProfileService, limiter shared.Limiter,
	limit int, window time.Duration) *PublicProfileController {
	return &PublicProfileController{svc: svc, limiter: limiter, limit: limit, window: window}
}

// @Summary		Public profile by nickname
// @Description	Served without authentication. A profile is visible only when its owner
// @Description	turned visibility on; otherwise the response is 404, so that the existence
// @Description	of a closed profile is not disclosed. Events are limited to published,
// @Description	non-archived ones that the person allowed to be shown.
// @Tags			profile
// @Produce		json
// @Param			nickname	path		string	true	"Nickname without the @ sign"
// @Success		200			{object}	dto.PublicProfileResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Failure		429			{object}	dto.ErrorResponse
// @Router			/profiles/{nickname} [get]
func (c *PublicProfileController) Get(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r) {
		httpx.Error(w, r, models.NewRateLimited("too many profile requests, try again later"))
		return
	}
	nickname := r.PathValue("nickname")
	if !models.NicknameFormatValid(nickname) {
		httpx.Error(w, r, models.NewNotFound("profile not found"))
		return
	}
	resp, err := c.svc.PublicProfile(r.Context(), nickname)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (c *PublicProfileController) allow(r *http.Request) bool {
	if c.limiter == nil {
		return true
	}
	return c.limiter.Allow("public-profile:"+httpx.ClientIP(r), c.limit, c.window)
}
