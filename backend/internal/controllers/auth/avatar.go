package auth

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

type AvatarService interface {
	Upload(ctx context.Context, actor models.Actor, data []byte) (*models.User, error)
	Remove(ctx context.Context, actor models.Actor) (*models.User, error)
	Open(ctx context.Context, key string) (*blobstore.Blob, error)
}

type AvatarController struct {
	svc      AvatarService
	limiter  shared.Limiter
	limit    int
	window   time.Duration
	maxBytes int64
}

func NewAvatarController(svc AvatarService, limiter shared.Limiter, limit int,
	window time.Duration, maxBytes int64) *AvatarController {
	return &AvatarController{svc: svc, limiter: limiter, limit: limit,
		window: window, maxBytes: maxBytes}
}

func (c *AvatarController) allow(r *http.Request) bool {
	if c.limiter == nil {
		return true
	}
	return c.limiter.Allow("avatar-upload:"+middleware.ActorFrom(r).UserID.String(),
		c.limit, c.window)
}

// @Summary		Upload or replace your avatar
// @Description	Accepts a single image part named "file". The stored type is decided by the
// @Description	file content, not by its name or declared type: only PNG, JPEG and WebP are kept.
// @Description	A previously stored file is deleted once the new one is in place.
// @Tags			profile
// @Accept			mpfd
// @Produce		json
// @Security		CookieAuth
// @Param			file	formData	file	true	"Image file"
// @Success		200		{object}	dto.MeResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		413		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me/avatar [post]
func (c *AvatarController) Upload(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r) {
		httpx.Error(w, r, models.NewRateLimited("too many avatar uploads, try again later"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, c.maxBytes+avatarEnvelopeSlack)
	if err := r.ParseMultipartForm(c.maxBytes + avatarEnvelopeSlack); err != nil {
		httpx.Error(w, r, avatarTooLarge(err, c.maxBytes))
		return
	}
	defer r.MultipartForm.RemoveAll()

	file, _, err := r.FormFile("file")
	if err != nil {
		httpx.Error(w, r, models.NewValidation("the image file is missing",
			models.FieldError{Field: "file", Message: "an image file is required"}))
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, c.maxBytes+1))
	if err != nil {
		httpx.Error(w, r, avatarTooLarge(err, c.maxBytes))
		return
	}

	user, err := c.svc.Upload(r.Context(), middleware.ActorFrom(r), data)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, shared.MeResponse(user))
}

// @Summary		Remove your avatar
// @Description	Deletes the stored file and falls back to the initials rendered by the client.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.MeResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/me/avatar [delete]
func (c *AvatarController) Remove(w http.ResponseWriter, r *http.Request) {
	user, err := c.svc.Remove(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, shared.MeResponse(user))
}

// @Summary		Fetch a stored avatar
// @Description	Serves an uploaded avatar by its server-generated key. The key is opaque and
// @Description	unguessable; no client-supplied path ever reaches the storage.
// @Tags			profile
// @Produce		png,jpeg
// @Param			key	path	string	true	"Storage key"
// @Success		200
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/avatars/{key} [get]
func (c *AvatarController) Serve(w http.ResponseWriter, r *http.Request) {
	blob, err := c.svc.Open(r.Context(), r.PathValue("key"))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	defer blob.Content.Close()

	w.Header().Set("Content-Type", blob.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(blob.Size, 10))
	w.Header().Set("Content-Disposition", "inline")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
	w.Header().Set("Cache-Control", "private, max-age=300")
	http.ServeContent(w, r, "", time.Time{}, blob.Content)
}

const avatarEnvelopeSlack = 8 << 10

func avatarTooLarge(err error, maxBytes int64) error {
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) || errors.Is(err, io.ErrUnexpectedEOF) {
		return models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: "at most " + strconv.FormatInt(maxBytes, 10) + " bytes"})
	}
	return models.NewValidation("the upload could not be read",
		models.FieldError{Field: "file", Message: "a valid multipart image upload is required"})
}
