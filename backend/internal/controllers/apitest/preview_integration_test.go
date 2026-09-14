//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strconv"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type previewBody struct {
	Type            string   `json:"type"`
	DaysBefore      *int     `json:"days_before"`
	Language        string   `json:"language"`
	Subject         string   `json:"subject"`
	Body            string   `json:"body"`
	Channels        []string `json:"channels"`
	ChannelReady    bool     `json:"channel_ready"`
	EventTitle      string   `json:"event_title"`
	RegistrationURL string   `json:"registration_url"`
	DeadlineLocal   string   `json:"deadline_local"`
	ScheduledAt     *string  `json:"scheduled_at"`
}

func previewPath(statusID string, query string) string {
	path := "/admin/registration-statuses/" + statusID + "/notification-preview"
	if query != "" {
		path += "?" + query
	}
	return path
}

func reminderQuery(days int) string {
	return "occasion=REMINDER_REGISTRATION_DEADLINE&days_before=" + strconv.Itoa(days)
}

func previewOf(c *support.Client, t *testing.T, statusID string, query string) previewBody {
	t.Helper()
	resp := c.Get(previewPath(statusID, query))
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

	first := previewOf(f.AdminClient, t, f.StatusID, "")
	second := previewOf(f.AdminClient, t, f.StatusID, reminderQuery(3))

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
		previewOf(f.AdminClient, t, f.StatusID, reminderQuery(3))
		previewOf(f.AdminClient, t, f.StatusID, "")
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
	russian := previewOf(f.AdminClient, t, f.StatusID, "")

	setLocale(s, t, f.Member.ID, "en")
	english := previewOf(f.AdminClient, t, f.StatusID, "")

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

func TestNotificationPreviewFollowsTheRequestedOccasion(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	primary := previewOf(f.AdminClient, t, f.StatusID, "")
	reminder := previewOf(f.AdminClient, t, f.StatusID, reminderQuery(3))
	late := previewOf(f.AdminClient, t, f.StatusID, "occasion=REGISTRATION_OVERDUE")

	for want, got := range map[string]previewBody{
		"REGISTRATION_REQUIRED":          primary,
		"REMINDER_REGISTRATION_DEADLINE": reminder,
		"REGISTRATION_OVERDUE":           late,
	} {
		if got.Type != want {
			t.Fatalf("expected type %s, got %s", want, got.Type)
		}
	}
	if primary.DaysBefore != nil {
		t.Fatal("the primary notification came back carrying a day count")
	}
	if reminder.DaysBefore == nil || *reminder.DaysBefore != 3 {
		t.Fatalf("the reminder preview lost the day it was asked for: %+v", reminder.DaysBefore)
	}
	if reminder.ScheduledAt == nil || late.ScheduledAt == nil {
		t.Fatal("a scheduled occasion came back without the moment it would be scheduled for")
	}
}

func TestNotificationPreviewRefusesADayOutsideTheAllowedSet(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, reminderQuery(5))),
		http.StatusBadRequest, "previewing a reminder for a day the schedule never offers")
	support.RequireStatus(t,
		f.AdminClient.Get(previewPath(f.StatusID, "occasion=REMINDER_REGISTRATION_DEADLINE")),
		http.StatusBadRequest, "previewing a deadline reminder without a day")
	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, "occasion=WEEKLY_DIGEST")),
		http.StatusBadRequest, "previewing an occasion that has no registration status")
}

func TestNotificationPreviewIsAdminOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	path := previewPath(f.StatusID, "")
	for name, acc := range map[string]support.Account{"the recipient": f.Member, "an outsider": f.Outsider} {
		resp := s.Session(t, acc).Get(path)
		support.RequireStatus(t, resp, http.StatusForbidden, "previewing a notification as "+name)
	}
	support.RequireStatus(t, s.Client(t).Get(path), http.StatusUnauthorized,
		"previewing a notification without signing in")
}

func TestNotificationPreviewRefusesAnUnknownStatus(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Get(previewPath(support.MissingStatusID, "")), http.StatusNotFound,
		"previewing a status that does not exist")
}

func TestNotificationPreviewRefusesAnArchivedEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	previewOf(f.AdminClient, t, f.StatusID, "")
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/archive", nil),
		http.StatusOK, "archiving the event")

	support.RequireStatus(t, f.AdminClient.Get(previewPath(f.StatusID, "")), http.StatusNotFound,
		"previewing a status of an archived event")
}

func TestNotificationPreviewReportsTheAbsenceOfAChannel(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	preview := previewOf(f.AdminClient, t, f.StatusID, "")
	if preview.ChannelReady || len(preview.Channels) != 0 {
		t.Fatalf("an unverified recipient without Telegram was reported as reachable: %+v", preview)
	}

	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE users SET email_verified_at = now() WHERE display_id = $1`, f.Member.ID); err != nil {
		t.Fatalf("verifying the email of %s: %v", f.Member.ID, err)
	}

	reachable := previewOf(f.AdminClient, t, f.StatusID, "")
	if !reachable.ChannelReady || len(reachable.Channels) != 1 || reachable.Channels[0] != "EMAIL" {
		t.Fatalf("a verified recipient was not reported as reachable by email: %+v", reachable)
	}
}

func TestNotificationPreviewNeverExposesAnInternalIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Get(previewPath(f.StatusID, reminderQuery(3)))
	support.RequireStatus(t, resp, http.StatusOK, "previewing a reminder")
	requireNoUUID(t, resp.Body, "the notification preview")
}
