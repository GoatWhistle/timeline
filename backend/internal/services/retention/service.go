package retention

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Service struct {
	events EventStore
	users  UserLookup
	audit  Recorder
	now    func() time.Time
}

func NewService(events EventStore, users UserLookup, audit Recorder) *Service {
	return &Service{events: events, users: users, audit: audit,
		now: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) GetSettings(ctx context.Context, actor models.Actor) (*models.RetentionSettings, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("retention settings are restricted to administrators")
	}
	return s.events.GetRetentionSettings(ctx)
}

func (s *Service) ToResponse(ctx context.Context, settings *models.RetentionSettings) dto.RetentionSettingsResponse {
	resp := dto.RetentionSettingsResponse{
		ArchiveAfterDays:         settings.ArchiveAfterDays,
		DeleteArchiveAfterMonths: settings.DeleteArchiveAfterMonths,
		DeleteCoversOnArchive:    settings.DeleteCoversOnArchive,
		AuditLogRetentionDays:    settings.AuditLogRetentionDays,
		UpdatedAt:                settings.UpdatedAt,
	}
	if settings.UpdatedBy != nil && s.users != nil {
		if u, err := s.users.GetByID(ctx, *settings.UpdatedBy); err == nil {
			resp.UpdatedBy = &u.DisplayID
		}
	}
	return resp
}

func (s *Service) UpdateSettings(ctx context.Context, actor models.Actor,
	req dto.UpdateRetentionSettingsRequest) (*models.RetentionSettings, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("retention settings are restricted to administrators")
	}
	if err := validateDays("archive_after_days", req.ArchiveAfterDays); err != nil {
		return nil, err
	}
	if err := validateMonths("delete_archive_after_months", req.DeleteArchiveAfterMonths); err != nil {
		return nil, err
	}
	if req.AuditLogRetentionDays != nil && (*req.AuditLogRetentionDays < 1 || *req.AuditLogRetentionDays > 3650) {
		return nil, models.NewValidation("the audit log retention period is out of range",
			models.FieldError{Field: "audit_log_retention_days", Code: models.FieldCodeOutOfRange,
				Message: "must be between 1 and 3650 days"})
	}

	before, err := s.events.GetRetentionSettings(ctx)
	if err != nil {
		return nil, err
	}

	deleteCovers := before.DeleteCoversOnArchive
	if req.DeleteCoversOnArchive != nil {
		deleteCovers = *req.DeleteCoversOnArchive
	}
	auditDays := before.AuditLogRetentionDays
	if req.AuditLogRetentionDays != nil {
		auditDays = *req.AuditLogRetentionDays
	}

	updated, err := s.events.UpdateRetentionSettings(ctx, actor.UserRef(),
		req.ArchiveAfterDays, req.DeleteArchiveAfterMonths, deleteCovers, auditDays)
	if err != nil {
		return nil, err
	}
	if err := s.audit.Record(ctx, actor, models.AuditRetentionChange, models.EntityRetentionSettings, uuid.Nil,
		retentionSnapshot(before), retentionSnapshot(updated)); err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *Service) CancelPurge(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("cancelling a scheduled deletion is restricted to administrators")
	}
	before, err := s.events.GetForUpdate(ctx, id)
	if err != nil {
		return nil, err
	}
	if !before.PurgeScheduled() {
		return nil, models.NewNotFound("no deletion is scheduled for this event")
	}
	updated, err := s.events.CancelPurge(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.audit.Record(ctx, actor, models.AuditEventPurgeCancel, models.EntityEvent, id,
		map[string]any{"purge_scheduled_at": before.PurgeScheduledAt},
		map[string]any{"purge_scheduled_at": nil}); err != nil {
		return nil, err
	}
	return updated, nil
}

func validateDays(field string, value *int) error {
	if value == nil {
		return nil
	}
	if *value < 1 || *value > 3650 {
		return models.NewValidation("the value is out of range",
			models.FieldError{Field: field, Code: models.FieldCodeOutOfRange,
				Message: "must be between 1 and 3650 days"})
	}
	return nil
}

func validateMonths(field string, value *int) error {
	if value == nil {
		return nil
	}
	if *value < 1 || *value > 600 {
		return models.NewValidation("the value is out of range",
			models.FieldError{Field: field, Code: models.FieldCodeOutOfRange,
				Message: "must be between 1 and 600 months"})
	}
	return nil
}

func retentionSnapshot(s *models.RetentionSettings) map[string]any {
	return map[string]any{
		"archive_after_days":          s.ArchiveAfterDays,
		"delete_archive_after_months": s.DeleteArchiveAfterMonths,
		"delete_covers_on_archive":    s.DeleteCoversOnArchive,
		"audit_log_retention_days":    s.AuditLogRetentionDays,
	}
}
