package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared"
)

const (
	calendarFeedPathPrefix   = "/api/v1/calendar/"
	calendarFeedPathSuffix   = "/feed.ics"
	calendarFeedWindowBack   = 365 * 24 * time.Hour
	calendarFeedWindowAhead  = 730 * 24 * time.Hour
	calendarFeedMinSecretLen = 22
)

type CalendarFeedService struct {
	db        *postgres.DB
	feeds     *identity.CalendarFeeds
	users     *identity.Users
	queries   *query.Timeline
	audit     *shared.AuditService
	publicURL string
	now       func() time.Time
}

func NewCalendarFeedService(db *postgres.DB, feeds *identity.CalendarFeeds,
	users *identity.Users, queries *query.Timeline, audit *shared.AuditService,
	publicURL string) *CalendarFeedService {
	return &CalendarFeedService{db: db, feeds: feeds, users: users, queries: queries,
		audit: audit, publicURL: publicURL,
		now: func() time.Time { return time.Now().UTC() }}
}

func (s *CalendarFeedService) Describe(ctx context.Context,
	actor models.Actor) (*models.CalendarFeedResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	token, err := s.feeds.GetActiveByUser(ctx, actor.UserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return &models.CalendarFeedResponse{Enabled: false}, nil
		}
		return nil, err
	}
	return &models.CalendarFeedResponse{
		Enabled:    true,
		CreatedAt:  &token.CreatedAt,
		LastUsedAt: token.LastUsedAt,
	}, nil
}

func (s *CalendarFeedService) Issue(ctx context.Context, actor models.Actor,
	rotate bool) (*models.CalendarFeedSecretResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	var result *models.CalendarFeedSecretResponse
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		_, err := s.feeds.GetActiveByUser(ctx, actor.UserID)
		switch {
		case err == nil && !rotate:
			return models.NewConflict("calendar_feed_exists",
				"a calendar feed already exists; rotate it to get a new address")
		case err == nil:
			if _, err := s.feeds.RevokeAllForUser(ctx, actor.UserID); err != nil {
				return err
			}
		case !errors.Is(err, models.ErrNotFound):
			return err
		}

		secret, err := shared.NewSecret()
		if err != nil {
			return err
		}
		token, err := s.feeds.Create(ctx, actor.UserID, shared.HashSecret(secret))
		if err != nil {
			return err
		}
		result = &models.CalendarFeedSecretResponse{
			URL:       s.feedURL(secret),
			CreatedAt: token.CreatedAt,
		}
		return s.audit.Record(ctx, actor, models.AuditCalendarFeedIssue,
			models.EntityCalendarFeed, token.ID, nil, map[string]any{"rotated": rotate})
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *CalendarFeedService) Revoke(ctx context.Context, actor models.Actor) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		token, err := s.feeds.GetActiveByUser(ctx, actor.UserID)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return nil
			}
			return err
		}
		if _, err := s.feeds.RevokeAllForUser(ctx, actor.UserID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditCalendarFeedRevoke,
			models.EntityCalendarFeed, token.ID, nil, nil)
	})
}

func (s *CalendarFeedService) Render(ctx context.Context, secret string) (string, error) {
	token, err := s.resolve(ctx, secret)
	if err != nil {
		return "", err
	}
	user, err := s.users.GetByID(ctx, token.UserID)
	if err != nil {
		return "", calendarFeedNotFound()
	}
	if !user.IsActive {
		return "", calendarFeedNotFound()
	}

	now := s.now()
	entries, err := s.entries(ctx, token.UserID, now)
	if err != nil {
		return "", err
	}
	if err := s.feeds.TouchLastUsed(ctx, token.ID, now); err != nil {
		return "", err
	}
	return shared.RenderCalendar("Timeline", entries, now), nil
}

func (s *CalendarFeedService) resolve(ctx context.Context,
	secret string) (*models.CalendarFeedToken, error) {
	if len(secret) < calendarFeedMinSecretLen {
		return nil, calendarFeedNotFound()
	}
	token, err := s.feeds.GetActiveByHash(ctx, shared.HashSecret(secret))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, calendarFeedNotFound()
		}
		return nil, err
	}
	if !token.Active() {
		return nil, calendarFeedNotFound()
	}
	return token, nil
}

func (s *CalendarFeedService) entries(ctx context.Context, userID uuid.UUID,
	now time.Time) ([]models.CalendarEntry, error) {
	filter := models.ScheduleFilter{
		From: now.Add(-calendarFeedWindowBack),
		To:   now.Add(calendarFeedWindowAhead),
	}
	rows, err := s.queries.ScheduleRows(ctx, filter, &userID, now)
	if err != nil {
		return nil, err
	}
	entries := make([]models.CalendarEntry, 0, len(rows)*3)
	for i := range rows {
		entries = appendCalendarRow(entries, &rows[i])
	}
	return entries, nil
}

func appendCalendarRow(entries []models.CalendarEntry,
	row *models.ScheduleRow) []models.CalendarEntry {
	entries = append(entries, models.CalendarEntry{
		Kind:     models.CalendarEntryEvent,
		EventID:  row.EventID,
		Summary:  row.Title,
		StartAt:  row.StartAt,
		EndAt:    row.EndAt,
		Location: calendarLocation(row.EffectiveFormat, nil, nil),
	})
	for j := range row.Stages {
		stage := &row.Stages[j]
		entries = append(entries, models.CalendarEntry{
			Kind:     models.CalendarEntryStage,
			EventID:  row.EventID,
			StageID:  stage.ID,
			Summary:  row.Title + ": " + stage.Name,
			StartAt:  stage.StartAt,
			EndAt:    stage.EndAt,
			Location: calendarLocation(stage.Place.Format, stage.Place.City, stage.Place.Venue),
		})
	}
	if row.RegistrationDeadline != nil {
		entries = append(entries, models.CalendarEntry{
			Kind:    models.CalendarEntryRegistration,
			EventID: row.EventID,
			Summary: row.Title + " - registration deadline",
			StartAt: *row.RegistrationDeadline,
			EndAt:   *row.RegistrationDeadline,
		})
	}
	return entries
}

func calendarLocation(format models.EventFormat, city, venue *string) string {
	parts := make([]string, 0, 3)
	if venue != nil && strings.TrimSpace(*venue) != "" {
		parts = append(parts, strings.TrimSpace(*venue))
	}
	if city != nil && strings.TrimSpace(*city) != "" {
		parts = append(parts, strings.TrimSpace(*city))
	}
	if len(parts) == 0 {
		return string(format)
	}
	return strings.Join(parts, ", ")
}

func (s *CalendarFeedService) feedURL(secret string) string {
	return strings.TrimRight(s.publicURL, "/") + calendarFeedPathPrefix + secret + calendarFeedPathSuffix
}

func calendarFeedNotFound() error {
	return models.NewNotFound("calendar feed not found")
}

func (s *UserService) WithCalendarFeeds(f *identity.CalendarFeeds) { s.feeds = f }

func (s *ProfileService) WithCalendarFeeds(f *identity.CalendarFeeds) { s.feeds = f }
