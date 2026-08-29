package digest

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/realtime"
)

type DigestService struct {
	digests *query.Digests
	events  *realtime.SystemEventService
	limits  config.Digest
	app     config.App
	now     func() time.Time
}

func NewDigestService(digests *query.Digests, events *realtime.SystemEventService,
	limits config.Digest, app config.App) *DigestService {
	return &DigestService{digests: digests, events: events, limits: limits, app: app,
		now: func() time.Time { return time.Now().UTC() }}
}

func (s *DigestService) zone(id string) *time.Location {
	trimmed := strings.TrimSpace(id)
	if trimmed == "" {
		return s.app.SystemTZ
	}
	zone, err := time.LoadLocation(trimmed)
	if err != nil {
		return s.app.SystemTZ
	}
	return zone
}

type DigestResult struct {
	Considered int
	Sent       int
	Skipped    int
}

func (s *DigestService) Run(ctx context.Context) (*DigestResult, error) {
	result := &DigestResult{}
	if s.events == nil {
		return result, nil
	}
	cursor := uuid.Nil
	for {
		recipients, err := s.digests.Recipients(ctx, cursor, s.batch())
		if err != nil {
			return result, err
		}
		if len(recipients) == 0 {
			return result, nil
		}
		for _, recipient := range recipients {
			if err := s.emit(ctx, recipient, result); err != nil {
				return result, err
			}
		}
		cursor = recipients[len(recipients)-1].UserID
		if len(recipients) < s.batch() {
			return result, nil
		}
	}
}

func (s *DigestService) emit(ctx context.Context, recipient models.DigestRecipient,
	result *DigestResult) error {
	result.Considered++

	digest, err := s.Build(ctx, recipient)
	if err != nil {
		return err
	}
	if digest.Empty() {
		result.Skipped++
		return nil
	}

	userID := recipient.UserID
	stored, err := s.events.Emit(ctx, realtime.EmitRequest{
		Type:     models.EventWeeklyDigest,
		Severity: models.SeverityInfo,
		Audience: models.AudienceUser,
		UserID:   &userID,
		Payload:  digestPayload(digest, s.zone(recipient.Timezone)),
		DedupKey: weeklyDigestKey(userID, digest.WeekStart),
	})
	if err != nil {
		return err
	}
	if stored != nil {
		result.Sent++
	}
	return nil
}

func (s *DigestService) Build(ctx context.Context,
	recipient models.DigestRecipient) (*models.WeeklyDigest, error) {
	start, end := WeekBounds(s.now(), s.zone(recipient.Timezone))
	digest := &models.WeeklyDigest{Recipient: recipient, WeekStart: start, WeekEnd: end}

	items, err := s.digests.Items(ctx, recipient.UserID, start, end, s.maxItems())
	if err != nil {
		return nil, err
	}
	digest.Items = items
	return digest, nil
}

func WeekBounds(now time.Time, location *time.Location) (time.Time, time.Time) {
	local := now.In(location)
	weekday := (int(local.Weekday()) + 6) % 7
	midnight := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
	start := midnight.AddDate(0, 0, -weekday)
	return start.UTC(), start.AddDate(0, 0, 7).UTC()
}

func digestPayload(digest *models.WeeklyDigest, location *time.Location) map[string]any {
	lang := locale.Normalize(digest.Recipient.Locale)

	entries := make([]map[string]any, 0, len(digest.Items))
	for _, item := range digest.Items {
		entries = append(entries, map[string]any{
			"kind":        string(item.Kind),
			"event_id":    item.EventID.String(),
			"event_title": item.EventTitle,
			"title":       item.Title,
			"at":          item.At.UTC().Format(time.RFC3339),
			"at_local":    item.At.In(location).Format("2006-01-02 15:04"),
		})
	}

	return map[string]any{
		"week_start": digest.WeekStart.UTC().Format(time.RFC3339),
		"week_end":   digest.WeekEnd.UTC().Format(time.RFC3339),
		"timezone":   location.String(),
		"language":   lang,
		"subject":    locale.Message(lang, "digest.weekly.subject"),
		"body":       digestBody(digest, lang, location),
		"total":      len(digest.Items),
		"deadlines":  digest.Count(models.DigestDeadline),
		"stages":     digest.Count(models.DigestStage),
		"tasks":      digest.Count(models.DigestTask),
		"items":      entries,
	}
}

func digestBody(digest *models.WeeklyDigest, lang string, location *time.Location) string {
	body := locale.Message(lang, "digest.weekly.intro",
		"from", digest.WeekStart.In(location).Format("2006-01-02"),
		"to", digest.WeekEnd.In(location).AddDate(0, 0, -1).Format("2006-01-02"),
		"timezone", location.String())

	for _, item := range digest.Items {
		body += "\n" + locale.Message(lang, "digest.weekly.line",
			"when", item.At.In(location).Format("2006-01-02 15:04"),
			"what", item.Title,
			"event", item.EventTitle,
			"kind", locale.Message(lang, "digest.kind."+digestKindKey(item.Kind)))
	}
	return body
}

func digestKindKey(kind models.DigestItemKind) string {
	switch kind {
	case models.DigestDeadline:
		return "deadline"
	case models.DigestStage:
		return "stage"
	case models.DigestTask:
		return "task"
	}
	return "other"
}

func weeklyDigestKey(userID uuid.UUID, weekStart time.Time) string {
	return "weekly-digest:" + userID.String() + ":" + weekStart.UTC().Format("2006-01-02")
}

func (s *DigestService) batch() int {
	if s.limits.Batch <= 0 {
		return 200
	}
	return s.limits.Batch
}

func (s *DigestService) maxItems() int {
	if s.limits.MaxItems <= 0 {
		return 50
	}
	return s.limits.MaxItems
}

func (s *DigestService) RunOnce(ctx context.Context) {
	result, err := s.Run(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "weekly digest pass failed", "error", err)
		return
	}
	slog.InfoContext(ctx, "weekly digest pass finished",
		"considered", result.Considered, "sent", result.Sent, "skipped", result.Skipped)
}

func (s *DigestService) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	s.RunOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.RunOnce(ctx)
		}
	}
}
