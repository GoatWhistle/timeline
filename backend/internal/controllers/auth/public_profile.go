package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type PublicProfileService interface {
	PublicProfile(ctx context.Context, nickname string, viewer *uuid.UUID) (dto.PublicProfileResponse, error)
}

type PublicProfileController struct {
	svc     PublicProfileService
	limiter httpsession.Limiter
	limit   int
	window  time.Duration
}

func NewPublicProfileController(svc PublicProfileService, limiter httpsession.Limiter,
	limit int, window time.Duration) *PublicProfileController {
	return &PublicProfileController{svc: svc, limiter: limiter, limit: limit, window: window}
}

// @Summary		Public profile by nickname
// @Description	Works without authentication, but reads the caller's session when one is present.
// @Description	Visibility is one of public (anyone), members (any signed-in user) or private
// @Description	(the owner only). Anything the viewer may not see answers 404, so the existence
// @Description	of a closed profile is not disclosed. Events are limited to published,
// @Description	non-archived ones that the person allowed to be shown. The summary field is
// @Description	present only for the profile owner and for administrators.
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
	if c.svc == nil || !models.NicknameFormatValid(nickname) {
		httpx.Error(w, r, models.NewNotFound("profile not found"))
		return
	}
	var viewer *uuid.UUID
	if u := middleware.CurrentUser(r); u != nil {
		viewer = &u.ID
	}
	resp, err := c.svc.PublicProfile(r.Context(), nickname, viewer)
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
