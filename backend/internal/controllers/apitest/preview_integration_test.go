//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type previewBody struct {
	Type            string  `json:"type"`
	RuleID          *string `json:"rule_id"`
	Language        string  `json:"language"`
	Subject         string  `json:"subject"`
	Body            string  `json:"body"`
	Channel         *string `json:"channel"`
	ChannelReady    bool    `json:"channel_ready"`
	EventTitle      string  `json:"event_title"`
	RegistrationURL string  `json:"registration_url"`
	DeadlineLocal   string  `json:"deadline_local"`
	ScheduledAt     *string `json:"scheduled_at"`
}

func previewPath(statusID string, ruleID *string) string {
	path := "/admin/registration-statuses/" + statusID + "/notification-preview"
	if ruleID != nil {
		path += "?rule_id=" + *ruleID
	}
	return path
}

func previewOf(c *support.Client, t *testing.T, statusID string, ruleID *string) previewBody {
	t.Helper()
	resp := c.Get(previewPath(statusID, ruleID))
	support.RequireStatus(t, resp, http.StatusOK, "previewing a notification")
	var body previewBody
	resp.Decode(t, &body)
	return body
}

func TestNotificationPreviewCreatesNothing(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	notifications := countNotifications(s, t)
	audit := countAudit(s, t)

	first := previewOf(f.AdminClient, t, f.StatusID, nil)
	second := previewOf(f.AdminClient, t, f.StatusID, &f.RegRuleID)

	if first.Subject == "" || first.Body == "" {
		t.Fatalf("the primary preview came back empty: %+v", first)
	}
	if second.Subject == "" || second.Body == "" {
		t.Fatalf("the reminder preview came back empty: %+v", second)
	}

	if after := countNotifications(s, t); after != notifications {
		t.Fatalf("previewing changed the notification count from %d to %d: "+
			"specification section 9.7 forbids any side effect", notifications, after)
	}
	if after := countAudit(s, t); after != audit {
		t.Fatalf("previewing wrote %d audit entries; section 9.7 forbids it", after-audit)
	}
}

func TestNotificationPreviewLeavesDeduplicationFree(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	before := logicalKeys(s, t, f.StatusID)

	for range 3 {
		previewOf(f.AdminClient, t, f.StatusID, &f.RegRuleID)
		previewOf(f.AdminClient, t, f.StatusID, nil)
	}

	after := logicalKeys(s, t, f.StatusID)
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
	s := support.NewStack(t)
	f := s.Seed(t)

	setLocale(s, t, f.Admin.ID, "en")
	setLocale(s, t, f.Member.ID, "ru")
	russian := previewOf(f.AdminClient, t, f.StatusID, nil)

	setLocale(s, t, f.Member.ID, "en")
	english := previewOf(f.AdminClient, t, f.StatusID, nil)

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
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/rules",
		map[string]any{"offset_minutes": -120})
	support.RequireStatus(t, resp, http.StatusCreated, "creating an overdue rule")
	var overdue struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &overdue)

	primary := previewOf(f.AdminClient, t, f.StatusID, nil)
	reminder := previewOf(f.AdminClient, t, f.StatusID, &f.RegRuleID)
	late := previewOf(f.AdminClient, t, f.StatusID, &overdue.ID)

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
	s := support.NewStack(t)
	f := s.Seed(t)

	path := previewPath(f.StatusID, nil)
	for name, acc := range map[string]support.Account{"the recipient": f.Member, "an outsider": f.Outsider} {
		resp := s.Session(t, acc).Get(path)
		support.RequireStatus(t, resp, http.StatusForbidden, "previewing a notification as "+name)
	}
	support.RequireStatus(t, s.Client(t).Get(path), http.StatusUnauthorized,
		"previewing a notification without signing in")
}

func TestNotificationPreviewRefusesAForeignRuleAndAnUnknownStatus(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Get(previewPath(support.MissingStatusID, nil)), http.StatusNotFound,
		"previewing a status that does not exist")

	unknown := support.MissingRuleID
	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, &unknown)), http.StatusNotFound,
		"previewing with a rule that does not exist")

	foreign := foreignRule(f.AdminClient, t, f.OtherEvent)
	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, &foreign)), http.StatusNotFound,
		"previewing a status with a rule belonging to another registration")
}

func TestNotificationPreviewRefusesAnArchivedEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	previewOf(f.AdminClient, t, f.StatusID, nil)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/archive", nil),
		http.StatusOK, "archiving the event")

	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, nil)), http.StatusNotFound,
		"previewing a status of an archived event")
}

func TestNotificationPreviewReportsTheAbsenceOfAChannel(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	preview := previewOf(f.AdminClient, t, f.StatusID, nil)
	if preview.ChannelReady || preview.Channel != nil {
		t.Fatalf("an unverified recipient without Telegram was reported as reachable: %+v", preview)
	}

	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE users SET email_verified_at = now() WHERE display_id = $1`, f.Member.ID); err != nil {
		t.Fatalf("verifying the email of %s: %v", f.Member.ID, err)
	}

	reachable := previewOf(f.AdminClient, t, f.StatusID, nil)
	if !reachable.ChannelReady || reachable.Channel == nil || *reachable.Channel != "EMAIL" {
		t.Fatalf("a verified recipient was not reported as reachable by email: %+v", reachable)
	}
}
