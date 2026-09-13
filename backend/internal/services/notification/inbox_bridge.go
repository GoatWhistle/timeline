package notification

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func inboxPrimaryKey(c models.ReconcileCandidate) string {
	return fmt.Sprintf("inbox:required:%s:av%d:rv%d:cv%d", c.ParticipantID, c.AssignmentVersion,
		c.ActivationVersion, c.ContentVersion)
}

func inboxRuleKey(c models.ReconcileCandidate, ruleID uuid.UUID) string {
	return fmt.Sprintf("inbox:rule:%s:%s:sv%d:tc%d:cv%d",
		c.StatusID, ruleID, c.ScheduleVersion, c.TodoCycle, c.ContentVersion)
}

func inboxKindName(kind models.NotificationType) string {
	switch kind {
	case models.NotificationOverdue:
		return "overdue"
	case models.NotificationReminder:
		return "reminder"
	default:
		return "primary"
	}
}

func (s *NotificationService) writeInboxItem(ctx context.Context, kind models.NotificationType,
	c models.ReconcileCandidate, logicalKey string) {
	if s.inbox == nil {
		return
	}
	zone, zoneID := s.recipientZone(c.RecipientTimezone)
	deadlineLocal := c.DeadlineAt.In(zone).Format("02.01.2006 15:04")
	lang := locale.Normalize(c.RecipientLocale)
	name := inboxKindName(kind)
	args := []string{"title", c.EventTitle, "deadline", deadlineLocal, "timezone", zoneID}
	title := locale.Message(lang, "inbox."+name+".title", args...)
	bodyMD := locale.Message(lang, "inbox."+name+".body_md", args...)

	subjectType := "event"
	eventID := c.EventID
	href := dto.NewDisplayID(dto.DisplayKindEvent, c.EventDisplayID).String()
	item := &models.InboxItem{
		RecipientUserID: c.RecipientID,
		Kind:            "notification." + name,
		Title:           title,
		BodyMD:          bodyMD,
		SubjectType:     &subjectType,
		SubjectID:       &eventID,
		Actions: []models.InboxAction{
			{Kind: models.InboxActionOpen, Href: &href},
			{Kind: models.InboxActionMarkRegistered},
		},
		LogicalKey: logicalKey,
	}
	if err := s.inbox.Create(ctx, item); err != nil {
		slog.WarnContext(ctx, "failed to write an inbox item for a notification",
			"error", err, "recipient_id", c.RecipientID, "logical_key", logicalKey)
	}
}

func inboxPersonalKind(kind models.NotificationType) string {
	switch kind {
	case models.NotificationWeeklyDigest:
		return "digest"
	case models.NotificationPersonalTaskDue:
		return "task"
	case models.NotificationRetrospectiveDue:
		return "retrospective"
	default:
		return "personal"
	}
}

func (s *NotificationService) writePersonalInboxItem(ctx context.Context, notice models.PersonalNotice) {
	if s.inbox == nil {
		return
	}
	item := &models.InboxItem{
		RecipientUserID: notice.RecipientID,
		Kind:            "notification." + inboxPersonalKind(notice.Type),
		Title:           notice.Subject,
		BodyMD:          notice.Body,
		LogicalKey:      "inbox:" + notice.LogicalKeyBase,
	}
	if notice.EventID != nil {
		subjectType := "event"
		item.SubjectType = &subjectType
		item.SubjectID = notice.EventID
	}
	if link := s.personalInboxLink(notice); link != "" {
		item.Actions = []models.InboxAction{{Kind: models.InboxActionOpen, Href: &link}}
	}
	if err := s.inbox.Create(ctx, item); err != nil {
		slog.WarnContext(ctx, "failed to write an inbox item for a personal notification",
			"error", err, "recipient_id", notice.RecipientID, "logical_key", notice.LogicalKeyBase)
	}
}

func (s *NotificationService) personalInboxLink(notice models.PersonalNotice) string {
	if notice.EventDisplayID == "" {
		return ""
	}
	return dto.NewDisplayID(dto.DisplayKindEvent, notice.EventDisplayID).String()
}
