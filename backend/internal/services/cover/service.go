package cover

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

type Service struct {
	db      TxRunner
	events  EventStore
	blobs   BlobStore
	fetcher Fetcher
	audit   Recorder
	limits  config.Cover
	now     func() time.Time

	background sync.WaitGroup
}

func NewService(db TxRunner, events EventStore, blobs BlobStore, fetcher Fetcher,
	auditor Recorder, limits config.Cover) *Service {
	return &Service{
		db: db, events: events, blobs: blobs, fetcher: fetcher, audit: auditor,
		limits: limits, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *Service) Upload(ctx context.Context, actor models.Actor, eventID uuid.UUID, data []byte,
) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("changing an event cover is restricted to administrators")
	}
	image, err := s.inspect(data)
	if err != nil {
		return nil, err
	}
	key, err := s.newKey(image.ContentType)
	if err != nil {
		return nil, err
	}
	stripped := blobstore.StripMetadata(data, image.ContentType)
	if err := s.blobs.Put(ctx, key, stripped, image.ContentType); err != nil {
		return nil, fmt.Errorf("store cover: %w", err)
	}

	url := models.CoverURL(key)
	var updated *models.Event
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		updated, err = s.events.SetManualCover(ctx, eventID, &url)
		if err != nil {
			return err
		}
		s.discard(ctx, models.CoverKeyFromURL(before.CoverManualURL), key)
		return s.audit.Record(ctx, actor, models.AuditEventCoverSet, models.EntityEvent, eventID,
			map[string]any{"cover_manual": before.CoverManualURL != nil},
			map[string]any{"cover_manual": true})
	})
	if err != nil {
		s.discard(ctx, key, "")
		return nil, err
	}
	return updated, nil
}

func (s *Service) Remove(ctx context.Context, actor models.Actor, eventID uuid.UUID,
) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("changing an event cover is restricted to administrators")
	}
	var updated *models.Event
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		if before.CoverManualURL == nil {
			return models.NewNotFound("no uploaded cover is set")
		}
		updated, err = s.events.SetManualCover(ctx, eventID, nil)
		if err != nil {
			return err
		}
		s.discard(ctx, models.CoverKeyFromURL(before.CoverManualURL), "")
		return s.audit.Record(ctx, actor, models.AuditEventCoverClear, models.EntityEvent, eventID,
			map[string]any{"cover_manual": true}, map[string]any{"cover_manual": false})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *Service) Open(ctx context.Context, key string) (*blobstore.Blob, error) {
	if !blobstore.ValidKey(key) {
		return nil, models.NewNotFound("cover not found")
	}
	blob, err := s.blobs.Open(ctx, key)
	if err != nil {
		if errors.Is(err, blobstore.ErrNotFound) || errors.Is(err, blobstore.ErrInvalidKey) {
			return nil, models.NewNotFound("cover not found")
		}
		return nil, err
	}
	return blob, nil
}

func (s *Service) inspect(data []byte) (blobstore.Image, error) {
	if len(data) == 0 {
		return blobstore.Image{}, models.NewValidation("the uploaded file is empty",
			models.FieldError{Field: "file", Message: "an image file is required"})
	}
	if int64(len(data)) > s.limits.MaxBytes {
		return blobstore.Image{}, models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: fmt.Sprintf("at most %d bytes", s.limits.MaxBytes)})
	}
	image, err := blobstore.InspectImage(data)
	if err != nil {
		return blobstore.Image{}, models.NewValidation("the file is not a supported image",
			models.FieldError{Field: "file", Message: "only PNG, JPEG and WebP images are accepted"})
	}
	if image.Width > s.limits.MaxDimension || image.Height > s.limits.MaxDimension {
		return blobstore.Image{}, models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: fmt.Sprintf("at most %d pixels on each side", s.limits.MaxDimension)})
	}
	return image, nil
}

func (s *Service) newKey(contentType string) (string, error) {
	ext := blobstore.ExtensionFor(contentType)
	if ext == "" {
		return "", models.NewValidation("the file is not a supported image",
			models.FieldError{Field: "file", Message: "only PNG, JPEG and WebP images are accepted"})
	}
	secret, err := crypto.NewSecret()
	if err != nil {
		return "", err
	}
	key := secret + "." + ext
	if !blobstore.ValidKey(key) {
		return "", fmt.Errorf("generated cover key is not storable")
	}
	return key, nil
}

func (s *Service) discard(ctx context.Context, key, keep string) {
	if key == "" || key == keep {
		return
	}
	if err := s.blobs.Delete(ctx, key); err != nil {
		slog.ErrorContext(ctx, "failed to delete cover file", "error", err)
	}
}

func (s *Service) DeleteForEvent(ctx context.Context, keys models.EventCoverKeys) {
	s.discard(ctx, keys.Manual, "")
	s.discard(ctx, keys.Auto, "")
}
