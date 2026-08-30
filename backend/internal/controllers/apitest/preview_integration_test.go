//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"
)

type previewBody struct {
	Type            string     `json:"type"`
	RuleID          *uuid.UUID `json:"rule_id"`
	Language        string     `json:"language"`
	Subject         string     `json:"subject"`
	Body            string     `json:"body"`
	Channel         *string    `json:"channel"`
	ChannelReady    bool       `json:"channel_ready"`
	EventTitle      string     `json:"event_title"`
	RegistrationURL string     `json:"registration_url"`
	DeadlineLocal   string     `json:"deadline_local"`
	ScheduledAt     *string    `json:"scheduled_at"`
}

func previewPath(statusID uuid.UUID, ruleID *uuid.UUID) string {
	path := "/admin/registration-statuses/" + statusID.String() + "/notification-preview"
	if ruleID != nil {
		path += "?rule_id=" + ruleID.String()
	}
	return path
}

func (c *client) preview(t *testing.T, statusID uuid.UUID, ruleID *uuid.UUID) previewBody {
	t.Helper()
	resp := c.get(previewPath(statusID, ruleID))
	requireStatus(t, resp, http.StatusOK, "previewing a notification")
	var body previewBody
	resp.decode(t, &body)
	return body
}

func TestNotificationPreviewCreatesNothing(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	notifications := s.countNotifications(t)
	audit := s.countAudit(t)

	first := f.adminClient.preview(t, f.statusID, nil)
	second := f.adminClient.preview(t, f.statusID, &f.regRuleID)

	if first.Subject == "" || first.Body == "" {
		t.Fatalf("the primary preview came back empty: %+v", first)
	}
	if second.Subject == "" || second.Body == "" {
		t.Fatalf("the reminder preview came back empty: %+v", second)
	}

	if after := s.countNotifications(t); after != notifications {
		t.Fatalf("previewing changed the notification count from %d to %d: "+
			"specification section 9.7 forbids any side effect", notifications, after)
	}
	if after := s.countAudit(t); after != audit {
		t.Fatalf("previewing wrote %d audit entries; section 9.7 forbids it", after-audit)
	}
}

func TestNotificationPreviewLeavesDeduplicationFree(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	before := s.logicalKeys(t, f.statusID)

	for range 3 {
		f.adminClient.preview(t, f.statusID, &f.regRuleID)
		f.adminClient.preview(t, f.statusID, nil)
	}

	after := s.logicalKeys(t, f.statusID)
	for _, key := range after {
		if !contains(before, key) {
			t.Fatalf("previewing claimed the logical key %q: the scheduler would now skip a "+
				"real notification it was supposed to create", key)
		}
	}
	if len(after) != len(before) {
		t.Fatalf("previewing moved the key count from %d to %d", len(before), len(after))
	}
}

func TestNotificationPreviewRendersInTheRecipientLanguage(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	s.setLocale(t, f.admin.ID, "en")
	s.setLocale(t, f.member.ID, "ru")
	russian := f.adminClient.preview(t, f.statusID, nil)

	s.setLocale(t, f.member.ID, "en")
	english := f.adminClient.preview(t, f.statusID, nil)

	if russian.Language != "ru" {
		t.Fatalf("a Russian recipient produced language %q", russian.Language)
	}
	if english.Language != "en" {
		t.Fatalf("an English recipient produced language %q", english.Language)
	}
	if russian.Subject == english.Subject {
		t.Fatalf("both recipients produced the same subject %q: the preview follows the "+
			"administrator, not the recipient", russian.Subject)
	}
}

func TestNotificationPreviewFollowsTheRuleSign(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	resp := f.adminClient.post("/admin/events/"+f.eventID.String()+"/registration/rules",
		map[string]any{"offset_minutes": -120})
	requireStatus(t, resp, http.StatusCreated, "creating an overdue rule")
	var overdue struct {
		ID uuid.UUID `json:"id"`
	}
	resp.decode(t, &overdue)

	primary := f.adminClient.preview(t, f.statusID, nil)
	reminder := f.adminClient.preview(t, f.statusID, &f.regRuleID)
	late := f.adminClient.preview(t, f.statusID, &overdue.ID)

	for want, got := range map[string]previewBody{
		"REGISTRATION_REQUIRED": primary,
		"REGISTRATION_REMINDER": reminder,
		"REGISTRATION_OVERDUE":  late,
	} {
		if got.Type != want {
			t.Fatalf("expected type %s, got %s", want, got.Type)
		}
	}
	if primary.RuleID != nil {
		t.Fatal("the primary notification came back carrying a rule identifier")
	}
	if reminder.ScheduledAt == nil || late.ScheduledAt == nil {
		t.Fatal("a rule preview came back without the moment it would be scheduled for")
	}
}

func TestNotificationPreviewIsAdminOnly(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	path := previewPath(f.statusID, nil)
	for name, acc := range map[string]account{"the recipient": f.member, "an outsider": f.outsider} {
		resp := s.session(t, acc).get(path)
		requireStatus(t, resp, http.StatusForbidden, "previewing a notification as "+name)
	}
	requireStatus(t, s.client(t).get(path), http.StatusUnauthorized,
		"previewing a notification without signing in")
}

func TestNotificationPreviewRefusesAForeignRuleAndAnUnknownStatus(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	requireStatus(t, f.adminClient.get(previewPath(uuid.New(), nil)), http.StatusNotFound,
		"previewing a status that does not exist")

	unknown := uuid.New()
	requireStatus(t, f.adminClient.get(previewPath(f.statusID, &unknown)), http.StatusNotFound,
		"previewing with a rule that does not exist")

	foreign := f.adminClient.foreignRule(t, f.otherEvent)
	requireStatus(t, f.adminClient.get(previewPath(f.statusID, &foreign)), http.StatusNotFound,
		"previewing a status with a rule belonging to another registration")
}

func TestNotificationPreviewRefusesAnArchivedEvent(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.adminClient.preview(t, f.statusID, nil)
	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID.String()+"/archive", nil),
		http.StatusOK, "archiving the event")

	requireStatus(t, f.adminClient.get(previewPath(f.statusID, nil)), http.StatusNotFound,
		"previewing a status of an archived event")
}

func TestNotificationPreviewReportsTheAbsenceOfAChannel(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	preview := f.adminClient.preview(t, f.statusID, nil)
	if preview.ChannelReady || preview.Channel != nil {
		t.Fatalf("an unverified recipient without Telegram was reported as reachable: %+v", preview)
	}

	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE users SET email_verified_at = now() WHERE id = $1`, f.member.ID); err != nil {
		t.Fatalf("verifying the email of %s: %v", f.member.ID, err)
	}

	reachable := f.adminClient.preview(t, f.statusID, nil)
	if !reachable.ChannelReady || reachable.Channel == nil || *reachable.Channel != "EMAIL" {
		t.Fatalf("a verified recipient was not reported as reachable by email: %+v", reachable)
	}
}
