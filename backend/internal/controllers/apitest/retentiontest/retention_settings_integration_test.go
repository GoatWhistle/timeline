//go:build integration

package retentiontest_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
	"github.com/GoatWhistle/timeline/internal/models"
)

type retentionSettings struct {
	ArchiveAfterDays         *int   `json:"archive_after_days"`
	DeleteArchiveAfterMonths *int   `json:"delete_archive_after_months"`
	DeleteCoversOnArchive    bool   `json:"delete_covers_on_archive"`
	AuditLogRetentionDays    int    `json:"audit_log_retention_days"`
	UpdatedBy                string `json:"updated_by"`
}

type retentionEvent struct {
	ID               string  `json:"id"`
	State            string  `json:"state"`
	ArchivedAt       *string `json:"archived_at"`
	PurgeScheduledAt *string `json:"purge_scheduled_at"`
}

func getEvent(t *testing.T, c *support.Client, id string) retentionEvent {
	t.Helper()
	resp := c.Get("/admin/events/" + id)
	support.RequireStatus(t, resp, http.StatusOK, "reading event "+id)
	var got retentionEvent
	resp.Decode(t, &got)
	return got
}

func TestRetentionSettingsAreAdminOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	resp := member.Get("/admin/retention-settings")
	support.RequireStatus(t, resp, http.StatusForbidden, "a participant reading retention settings")
}

func TestRetentionSettingsRoundTrip(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	updated := f.AdminClient.Patch("/admin/retention-settings", map[string]any{
		"archive_after_days":          14,
		"delete_archive_after_months": 6,
		"delete_covers_on_archive":    true,
		"audit_log_retention_days":    180,
	})
	support.RequireStatus(t, updated, http.StatusOK, "updating retention settings")
	var got retentionSettings
	updated.Decode(t, &got)
	if got.ArchiveAfterDays == nil || *got.ArchiveAfterDays != 14 {
		t.Fatalf("archive_after_days did not persist: %+v", got)
	}
	if got.DeleteArchiveAfterMonths == nil || *got.DeleteArchiveAfterMonths != 6 {
		t.Fatalf("delete_archive_after_months did not persist: %+v", got)
	}
	if !got.DeleteCoversOnArchive {
		t.Fatalf("delete_covers_on_archive did not persist: %+v", got)
	}
	if got.AuditLogRetentionDays != 180 {
		t.Fatalf("audit_log_retention_days did not persist: %+v", got)
	}
	if got.UpdatedBy == "" {
		t.Fatalf("updated_by was not recorded: %+v", got)
	}

	read := f.AdminClient.Get("/admin/retention-settings")
	support.RequireStatus(t, read, http.StatusOK, "reading retention settings back")
	var reread retentionSettings
	read.Decode(t, &reread)
	if reread.ArchiveAfterDays == nil || *reread.ArchiveAfterDays != 14 {
		t.Fatalf("the update did not survive a re-read: %+v", reread)
	}
}

func TestRetentionSettingsRejectOutOfRangeValues(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Patch("/admin/retention-settings", map[string]any{"archive_after_days": 0})
	support.RequireStatus(t, resp, http.StatusBadRequest, "archive_after_days = 0")

	resp = f.AdminClient.Patch("/admin/retention-settings", map[string]any{"delete_archive_after_months": -1})
	support.RequireStatus(t, resp, http.StatusBadRequest, "delete_archive_after_months = -1")
}

func TestCancelPurgeRequiresAnExistingSchedule(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Post("/admin/events/"+f.EventID+"/purge-cancel", nil)
	support.RequireStatus(t, resp, http.StatusNotFound, "cancelling a purge that was never scheduled")
}

func TestCancelPurgeIsAdminOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	resp := member.Post("/admin/events/"+f.EventID+"/purge-cancel", nil)
	support.RequireStatus(t, resp, http.StatusForbidden, "a participant cancelling a scheduled purge")
}

func TestAutomaticPurgeRefusesANonArchivedEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	ctx := context.Background()

	id, err := s.EventService().ResolveDisplayID(ctx, f.EventID)
	if err != nil {
		t.Fatalf("resolving the event id: %v", err)
	}
	if err := s.EventService().Delete(ctx, models.Actor{}, id); err == nil {
		t.Fatal("the system actor purged a published, non-archived event")
	}
	if got := getEvent(t, f.AdminClient, f.EventID); got.State == "" {
		t.Fatalf("the refused purge still affected the event: %+v", got)
	}
}

func TestAutomaticPurgeDeletesOnlyAfterArchiving(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	ctx := context.Background()

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/archive", nil),
		http.StatusOK, "archiving the event before an automatic purge")

	id, err := s.EventService().ResolveDisplayID(ctx, f.OtherEvent)
	if err != nil {
		t.Fatalf("resolving the event id: %v", err)
	}
	if err := s.EventService().Delete(ctx, models.Actor{}, id); err != nil {
		t.Fatalf("the system actor could not purge an archived event with no notifications: %v", err)
	}

	resp := f.AdminClient.Get("/admin/events/" + f.OtherEvent)
	support.RequireStatus(t, resp, http.StatusNotFound, "reading a purged event")
}

func TestDeletingAnEventWithNotificationsFailsWithAnHonestMessage(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	memberID := s.UserUUID(t, f.Member.ID)
	var registrationStatusUUID string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT id FROM registration_statuses WHERE display_id = $1`, f.StatusID).Scan(&registrationStatusUUID); err != nil {
		t.Fatalf("resolving the registration status: %v", err)
	}
	if _, err := s.DB().Pool().Exec(context.Background(), `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			assignment_version, activation_version, notification_content_version,
			logical_key, requested_channel, status, scheduled_at)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 1, 1, $3, 'EMAIL', 'PENDING', now())`,
		memberID, registrationStatusUUID, "test-logical-key-"+f.StatusID); err != nil {
		t.Fatalf("seeding a notification: %v", err)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/archive", nil),
		http.StatusOK, "archiving the event before attempting to delete it")

	resp := f.AdminClient.Delete("/admin/events/" + f.EventID)
	if resp.Status == http.StatusInternalServerError {
		t.Fatalf("deleting an event with notifications leaked a raw database error: %s", resp.Body)
	}
	support.RequireStatus(t, resp, http.StatusConflict, "deleting an event that still has notifications")
	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	resp.Decode(t, &body)
	if !support.ContainsAll(body.Error.Message, "notifications", "archive") {
		t.Fatalf("the refusal does not explain why: %q", body.Error.Message)
	}

	stillThere := f.AdminClient.Get("/admin/events/" + f.EventID)
	support.RequireStatus(t, stillThere, http.StatusOK, "the event must survive a refused delete")
}

func TestSchedulingAPurgeMarksTheEventWithoutDeletingIt(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	ctx := context.Background()

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/archive", nil),
		http.StatusOK, "archiving the event before scheduling a purge")

	id, err := s.EventService().ResolveDisplayID(ctx, f.EventID)
	if err != nil {
		t.Fatalf("resolving the event id: %v", err)
	}
	at := time.Now().UTC().Add(30 * 24 * time.Hour)
	if _, err := s.Events().SchedulePurge(ctx, id, at); err != nil {
		t.Fatalf("scheduling a purge: %v", err)
	}

	got := getEvent(t, f.AdminClient, f.EventID)
	if got.PurgeScheduledAt == nil {
		t.Fatal("purge_scheduled_at is not visible through the API after scheduling")
	}
	if got.State != "ARCHIVED" {
		t.Fatalf("scheduling a purge changed the event state to %q", got.State)
	}

	cancelled := f.AdminClient.Post("/admin/events/"+f.EventID+"/purge-cancel", nil)
	support.RequireStatus(t, cancelled, http.StatusOK, "cancelling the scheduled purge")

	after := getEvent(t, f.AdminClient, f.EventID)
	if after.PurgeScheduledAt != nil {
		t.Fatalf("purge_scheduled_at survived cancellation: %+v", after)
	}
	if after.State != "ARCHIVED" {
		t.Fatalf("cancelling a purge changed the event state to %q", after.State)
	}
}
