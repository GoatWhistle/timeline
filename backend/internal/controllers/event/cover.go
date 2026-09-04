package event

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

type CoverService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Upload(ctx context.Context, actor models.Actor, eventID uuid.UUID, data []byte) (*models.Event, error)
	Remove(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.Event, error)
	Refresh(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.Event, error)
	Open(ctx context.Context, key string) (*blobstore.Blob, error)
}

type CoverController struct {
	svc      CoverService
	maxBytes int64
}

func NewCoverController(svc CoverService, maxBytes int64) *CoverController {
	return &CoverController{svc: svc, maxBytes: maxBytes}
}

const coverEnvelopeSlack = 8 << 10

func (c *CoverController) eventID(r *http.Request) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveDisplayID)
}

func (c *CoverController) respond(w http.ResponseWriter, event *models.Event) {
	httpx.JSON(w, http.StatusOK, presenter.EventResponse(event, time.Now().UTC(), true))
}

// @Summary		Upload or replace the event cover
// @Description	Accepts a single image part named "file". The stored type is decided by the file
// @Description	content, not by its name or declared type: only PNG, JPEG and WebP are kept, and
// @Description	metadata is stripped. An uploaded cover always wins over the automatically fetched
// @Description	one and is never overwritten by a refresh.
// @Tags			events
// @Accept			mpfd
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string	true	"Event display id"
// @Param			file	formData	file	true	"Image file"
// @Success		200		{object}	dto.EventResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		413		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/cover [post]
func (c *CoverController) Upload(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, c.maxBytes+coverEnvelopeSlack)
	if err := r.ParseMultipartForm(c.maxBytes + coverEnvelopeSlack); err != nil {
		httpx.Error(w, r, coverTooLarge(err, c.maxBytes))
		return
	}
	defer func() { _ = r.MultipartForm.RemoveAll() }()

	file, _, err := r.FormFile("file")
	if err != nil {
		httpx.Error(w, r, models.NewValidation("the image file is missing",
			models.FieldError{Field: "file", Message: "an image file is required"}))
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, c.maxBytes+1))
	if err != nil {
		httpx.Error(w, r, coverTooLarge(err, c.maxBytes))
		return
	}

	event, err := c.svc.Upload(r.Context(), middleware.ActorFrom(r), id, data)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.respond(w, event)
}

// @Summary		Remove the uploaded event cover
// @Description	Deletes the stored file. An automatically fetched cover, if any, becomes visible again.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event display id"
// @Success		200	{object}	dto.EventResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/cover [delete]
func (c *CoverController) Remove(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	event, err := c.svc.Remove(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.respond(w, event)
}

// @Summary		Fetch the cover from the event website
// @Description	Reads the og:image declared by website_url. The address is validated against
// @Description	private and loopback networks after DNS resolution and on every redirect; the
// @Description	response is capped in size, time and redirect count and must decode as an image.
// @Description	An uploaded cover is left untouched and keeps taking precedence.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event display id"
// @Success		200	{object}	dto.EventResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		409	{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/cover/refresh [post]
func (c *CoverController) Refresh(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	event, err := c.svc.Refresh(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.respond(w, event)
}

// @Summary		Fetch a stored cover
// @Description	Serves a stored cover by its server-generated key. The key is opaque and
// @Description	unguessable; no client-supplied path ever reaches the storage.
// @Tags			events
// @Produce		png,jpeg
// @Param			key	path	string	true	"Storage key"
// @Success		200
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/covers/{key} [get]
func (c *CoverController) Serve(w http.ResponseWriter, r *http.Request) {
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

func coverTooLarge(err error, maxBytes int64) error {
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) || errors.Is(err, io.ErrUnexpectedEOF) {
		return models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: "at most " + strconv.FormatInt(maxBytes, 10) + " bytes"})
	}
	return models.NewValidation("the upload could not be read",
		models.FieldError{Field: "file", Message: "a valid multipart image upload is required"})
}
