package cover

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/imagefetch"
)

func (s *Service) Refresh(ctx context.Context, actor models.Actor, eventID uuid.UUID,
) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("changing an event cover is restricted to administrators")
	}
	if !s.limits.FetchEnabled || s.fetcher == nil {
		return nil, models.NewConflict("cover_fetch_disabled", "automatic cover fetching is disabled")
	}
	current, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if current.WebsiteURL == nil || *current.WebsiteURL == "" {
		return nil, models.NewConflict("website_url_missing",
			"the event has no website to fetch a cover from")
	}
	if err := s.fetchInto(ctx, eventID, *current.WebsiteURL); err != nil {
		return nil, err
	}
	return s.events.GetByID(ctx, eventID)
}

func (s *Service) RefreshForWebsite(ctx context.Context, eventID uuid.UUID, website string) {
	if !s.limits.FetchEnabled || s.fetcher == nil || website == "" {
		return
	}
	detached := context.WithoutCancel(ctx)
	s.background.Add(1)
	go func() {
		defer s.background.Done()
		timed, cancel := context.WithTimeout(detached, s.limits.FetchTimeout+backgroundSlack)
		defer cancel()
		if err := s.fetchInto(timed, eventID, website); err != nil {
			slog.WarnContext(timed, "automatic cover fetch failed", "error", err)
		}
	}()
}

const backgroundSlack = 5 * time.Second

func (s *Service) WaitForBackground() { s.background.Wait() }

func (s *Service) fetchInto(ctx context.Context, eventID uuid.UUID, website string) error {
	cover, err := s.fetcher.FetchCover(ctx, website)
	if err != nil {
		return fetchFailure(err)
	}
	if int64(len(cover.Data)) > s.limits.MaxBytes {
		return models.NewConflict("cover_fetch_failed", "the fetched image is too large")
	}
	if cover.Width > s.limits.MaxDimension || cover.Height > s.limits.MaxDimension {
		return models.NewConflict("cover_fetch_failed", "the fetched image is too large")
	}

	key, err := s.newKey(cover.ContentType)
	if err != nil {
		return err
	}
	if err := s.blobs.Put(ctx, key, cover.Data, cover.ContentType); err != nil {
		return fmt.Errorf("store cover: %w", err)
	}

	url := models.CoverURL(key)
	source := cover.SourceURL
	at := s.now()
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		if _, err := s.events.SetAutoCover(ctx, eventID, &url, &source, &at); err != nil {
			return err
		}
		s.discard(ctx, models.CoverKeyFromURL(before.CoverAutoURL), key)
		return nil
	})
	if err != nil {
		s.discard(ctx, key, "")
		return err
	}
	return nil
}

func fetchFailure(err error) error {
	switch {
	case errors.Is(err, imagefetch.ErrBlockedDestination),
		errors.Is(err, imagefetch.ErrBlockedHost),
		errors.Is(err, imagefetch.ErrBlockedScheme):
		return models.NewConflict("cover_fetch_blocked",
			"the website address does not point at a reachable public host")
	case errors.Is(err, imagefetch.ErrNoCover):
		return models.NewConflict("cover_not_found", "the website declares no cover image")
	case errors.Is(err, imagefetch.ErrNotAnImage), errors.Is(err, blobstore.ErrUnsupportedType):
		return models.NewConflict("cover_fetch_failed", "the linked file is not a supported image")
	case errors.Is(err, imagefetch.ErrTooLarge):
		return models.NewConflict("cover_fetch_failed", "the fetched image is too large")
	case errors.Is(err, imagefetch.ErrTooManyRedirects):
		return models.NewConflict("cover_fetch_failed", "the website redirected too many times")
	case errors.Is(err, imagefetch.ErrUnresolvable):
		return models.NewConflict("cover_fetch_failed", "the website address could not be resolved")
	}
	return models.NewConflict("cover_fetch_failed", "the cover could not be fetched")
}
