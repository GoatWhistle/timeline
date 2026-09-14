package retention

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type fakeEventStore struct {
	settings models.RetentionSettings
	events   map[uuid.UUID]*models.Event

	finishedPublished []uuid.UUID
	archivedNoPurge   []uuid.UUID
	purgeDue          []uuid.UUID

	scheduledPurgeAt map[uuid.UUID]time.Time
	cancelledPurge   map[uuid.UUID]bool

	updateCalls int
}

func newFakeEventStore() *fakeEventStore {
	return &fakeEventStore{
		events:           map[uuid.UUID]*models.Event{},
		scheduledPurgeAt: map[uuid.UUID]time.Time{},
		cancelledPurge:   map[uuid.UUID]bool{},
	}
}

func (f *fakeEventStore) GetRetentionSettings(context.Context) (*models.RetentionSettings, error) {
	copied := f.settings
	return &copied, nil
}

func (f *fakeEventStore) UpdateRetentionSettings(_ context.Context, actorID *uuid.UUID,
	archiveAfterDays, deleteArchiveAfterMonths *int, deleteCoversOnArchive bool, auditLogRetentionDays int,
) (*models.RetentionSettings, error) {
	f.updateCalls++
	f.settings = models.RetentionSettings{
		ArchiveAfterDays:         archiveAfterDays,
		DeleteArchiveAfterMonths: deleteArchiveAfterMonths,
		DeleteCoversOnArchive:    deleteCoversOnArchive,
		AuditLogRetentionDays:    auditLogRetentionDays,
		UpdatedBy:                actorID,
		UpdatedAt:                time.Now().UTC(),
	}
	copied := f.settings
	return &copied, nil
}

func (f *fakeEventStore) FinishedPublishedBefore(context.Context, time.Time, int) ([]uuid.UUID, error) {
	return f.finishedPublished, nil
}

func (f *fakeEventStore) ArchivedWithoutPurgeBefore(context.Context, time.Time, int) ([]uuid.UUID, error) {
	return f.archivedNoPurge, nil
}

func (f *fakeEventStore) PurgeDueBefore(context.Context, time.Time, int) ([]uuid.UUID, error) {
	return f.purgeDue, nil
}

func (f *fakeEventStore) SchedulePurge(_ context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	f.scheduledPurgeAt[id] = at
	if e, ok := f.events[id]; ok {
		e.PurgeScheduledAt = &at
		return e, nil
	}
	return &models.Event{ID: id, PurgeScheduledAt: &at}, nil
}

func (f *fakeEventStore) CancelPurge(_ context.Context, id uuid.UUID) (*models.Event, error) {
	f.cancelledPurge[id] = true
	if e, ok := f.events[id]; ok {
		e.PurgeScheduledAt = nil
		return e, nil
	}
	return &models.Event{ID: id}, nil
}

func (f *fakeEventStore) GetForUpdate(_ context.Context, id uuid.UUID) (*models.Event, error) {
	if e, ok := f.events[id]; ok {
		copied := *e
		return &copied, nil
	}
	return nil, models.NewNotFound("event not found")
}

type fakeRecorder struct{ actions []models.AuditAction }

func (r *fakeRecorder) Record(_ context.Context, _ models.Actor, action models.AuditAction,
	_ models.EntityType, _ uuid.UUID, _, _ any) error {
	r.actions = append(r.actions, action)
	return nil
}

type fakeArchiver struct {
	archived []uuid.UUID
	err      error
}

func (f *fakeArchiver) Archive(_ context.Context, _ models.Actor, id uuid.UUID) (*models.Event, error) {
	if f.err != nil {
		return nil, f.err
	}
	f.archived = append(f.archived, id)
	return &models.Event{ID: id}, nil
}

type fakeDeleter struct {
	deleted []uuid.UUID
	err     error
}

func (f *fakeDeleter) Delete(_ context.Context, _ models.Actor, id uuid.UUID) error {
	if f.err != nil {
		return f.err
	}
	f.deleted = append(f.deleted, id)
	return nil
}

type fakeCoverClearer struct{ cleared []uuid.UUID }

func (f *fakeCoverClearer) ClearCoverForArchive(_ context.Context, id uuid.UUID) error {
	f.cleared = append(f.cleared, id)
	return nil
}

type fakeUsers struct{}

func (fakeUsers) GetByID(_ context.Context, id uuid.UUID) (*models.User, error) {
	return &models.User{ID: id, DisplayID: "us_test"}, nil
}

func days(n int) *int   { return &n }
func months(n int) *int { return &n }

func nowPtr() *time.Time {
	t := time.Now().UTC()
	return &t
}

type fakeSessionStore struct {
	idleDays map[uuid.UUID]*int
	revoked  []uuid.UUID
	calls    int
	now      time.Time
	limit    int

	sessions []fakeSession
}

type fakeSession struct {
	id         uuid.UUID
	userID     uuid.UUID
	lastUsedAt *time.Time
	createdAt  time.Time
	revokedAt  *time.Time
}

func (f *fakeSessionStore) RevokeIdle(_ context.Context, now time.Time, limit int) (int, error) {
	f.calls++
	f.now = now
	f.limit = limit
	return len(f.revoked), nil
}
