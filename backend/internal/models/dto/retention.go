package dto

import (
	"time"
)

type RetentionSettingsResponse struct {
	ArchiveAfterDays         *int      `json:"archive_after_days,omitempty" example:"30"`
	DeleteArchiveAfterMonths *int      `json:"delete_archive_after_months,omitempty" example:"24"`
	DeleteCoversOnArchive    bool      `json:"delete_covers_on_archive"`
	AuditLogRetentionDays    int       `json:"audit_log_retention_days" example:"365"`
	UpdatedBy                *string   `json:"updated_by,omitempty" example:"us_gma9hq8a96q5"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type UpdateRetentionSettingsRequest struct {
	ArchiveAfterDays         *int  `json:"archive_after_days"`
	DeleteArchiveAfterMonths *int  `json:"delete_archive_after_months"`
	DeleteCoversOnArchive    *bool `json:"delete_covers_on_archive,omitempty"`
	AuditLogRetentionDays    *int  `json:"audit_log_retention_days,omitempty" example:"365"`
}
