//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type feedPage struct {
	Items []struct {
		ID       string `json:"id"`
		Type     string `json:"type"`
		Severity string `json:"severity"`
		Read     bool   `json:"read"`
	} `json:"items"`
	Meta struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

func emit(s *support.Stack, t *testing.T, req svcrealtime.EmitRequest) *models.SystemEvent {
	t.Helper()
	stored, err := s.Feed().Emit(context.Background(), req)
	if err != nil {
		t.Fatalf("emitting a system event: %v", err)
	}
	return stored
}

func TestFeedNeverShowsAnotherPersonsEvents(t *testing.T) {
	s := support.NewStack(t)
	owner := s.Register(t, "feed-owner@example.com")
	stranger := s.Register(t, "feed-stranger@example.com")

	ownerUUID := s.UserUUID(t, owner.ID)
	personal := emit(s, t, svcrealtime.EmitRequest{
		Type:     models.EventRegistrationReminder,
		Severity: models.SeverityInfo,
		Audience: models.AudienceUser,
		UserID:   &ownerUUID,
		Payload:  map[string]any{"subject": "a deadline is close"},
	})
	if personal == nil {
		t.Fatal("the personal event was not stored")
	}

	ownerClient := s.Session(t, owner)
	var mine feedPage
	resp := ownerClient.Get("/me/events-feed")
	support.RequireStatus(t, resp, http.StatusOK, "reading the owner feed")
	resp.Decode(t, &mine)
	if mine.Meta.Total != 1 || len(mine.Items) != 1 || mine.Items[0].ID != personal.DisplayID {
		t.Fatalf("the owner did not receive their own event: %s", resp.Body)
	}

	strangerClient := s.Session(t, stranger)
	var theirs feedPage
	resp = strangerClient.Get("/me/events-feed")
	support.RequireStatus(t, resp, http.StatusOK, "reading the stranger feed")
	resp.Decode(t, &theirs)
	if theirs.Meta.Total != 0 || len(theirs.Items) != 0 {
		t.Fatalf("a stranger read somebody else's feed: %s", resp.Body)
	}
}

func TestFeedKeepsAdminEventsFromMembers(t *testing.T) {
	s := support.NewStack(t)
	admin := s.Register(t, "feed-admin@example.com")
	s.Promote(t, admin.ID)
	member := s.Register(t, "feed-member@example.com")

	failure := uuid.New()
	stored := emit(s, t, svcrealtime.EmitRequest{
		Type:        models.EventNotificationFailed,
		Severity:    models.SeverityWarning,
		Audience:    models.AudienceAdmin,
		SubjectType: "notification",
		SubjectID:   &failure,
		Payload:     map[string]any{"reason": "the provider call limit is exhausted"},
		DedupKey:    "NOTIFICATION_FAILED:" + failure.String(),
	})
	if stored == nil {
		t.Fatal("the administrative event was not stored")
	}

	memberClient := s.Session(t, member)
	var theirs feedPage
	resp := memberClient.Get("/me/events-feed")
	support.RequireStatus(t, resp, http.StatusOK, "reading the member feed")
	resp.Decode(t, &theirs)
	if theirs.Meta.Total != 0 {
		t.Fatalf("a member read the administrative feed: %s", resp.Body)
	}

	adminClient := s.Session(t, admin)
	var ours feedPage
	resp = adminClient.Get("/me/events-feed")
	support.RequireStatus(t, resp, http.StatusOK, "reading the administrator feed")
	resp.Decode(t, &ours)
	if ours.Meta.Total != 1 {
		t.Fatalf("the administrator did not receive the administrative event: %s", resp.Body)
	}
}

func TestMarkReadIgnoresInvisibleIdentifiers(t *testing.T) {
	s := support.NewStack(t)
	owner := s.Register(t, "read-owner@example.com")
	stranger := s.Register(t, "read-stranger@example.com")

	ownerUUID := s.UserUUID(t, owner.ID)
	hidden := emit(s, t, svcrealtime.EmitRequest{
		Type:     models.EventRegistrationReminder,
		Severity: models.SeverityInfo,
		Audience: models.AudienceUser,
		UserID:   &ownerUUID,
		Payload:  map[string]any{"subject": "a deadline is close"},
	})

	strangerClient := s.Session(t, stranger)
	resp := strangerClient.Post("/me/events-feed/read",
		map[string]any{"ids": []string{hidden.DisplayID}})
	support.RequireStatus(t, resp, http.StatusOK, "marking an invisible event read")

	var counter struct {
		Unread int64 `json:"unread"`
	}
	ownerClient := s.Session(t, owner)
	resp = ownerClient.Get("/me/events-feed/unread-count")
	support.RequireStatus(t, resp, http.StatusOK, "reading the owner unread count")
	resp.Decode(t, &counter)
	if counter.Unread != 1 {
		t.Fatalf("a stranger marked somebody else's event read: unread is %d", counter.Unread)
	}
}

func TestUnreadCountFallsAfterMarkingRead(t *testing.T) {
	s := support.NewStack(t)
	owner := s.Register(t, "unread-owner@example.com")
	ownerUUID := s.UserUUID(t, owner.ID)
	for i := 0; i < 3; i++ {
		emit(s, t, svcrealtime.EmitRequest{
			Type:     models.EventRegistrationReminder,
			Severity: models.SeverityInfo,
			Audience: models.AudienceUser,
			UserID:   &ownerUUID,
			Payload:  map[string]any{"index": i},
		})
	}

	c := s.Session(t, owner)
	var counter struct {
		Unread int64 `json:"unread"`
	}
	resp := c.Get("/me/events-feed/unread-count")
	support.RequireStatus(t, resp, http.StatusOK, "reading the unread count")
	resp.Decode(t, &counter)
	if counter.Unread != 3 {
		t.Fatalf("expected three unread entries, got %d", counter.Unread)
	}

	resp = c.Post("/me/events-feed/read", map[string]any{})
	support.RequireStatus(t, resp, http.StatusOK, "marking the whole feed read")
	resp.Decode(t, &counter)
	if counter.Unread != 0 {
		t.Fatalf("expected an empty unread count after marking all read, got %d", counter.Unread)
	}
}

func TestAdminUnreadCountAgreesWithTheFeedAfterMarkingRead(t *testing.T) {
	s := support.NewStack(t)
	admin := s.Register(t, "admin-unread@example.com")
	s.Promote(t, admin.ID)

	emit(s, t, svcrealtime.EmitRequest{
		Type:     models.EventQueueAgeNormal,
		Severity: models.SeverityInfo,
		Audience: models.AudienceAdmin,
		Payload:  map[string]any{"state": "normal"},
	})
	emit(s, t, svcrealtime.EmitRequest{
		Type:     models.EventWorkerRecovered,
		Severity: models.SeverityInfo,
		Audience: models.AudienceAdmin,
		Payload:  map[string]any{"state": "healthy"},
	})

	c := s.Session(t, admin)
	var counter struct {
		Unread int64 `json:"unread"`
	}
	resp := c.Get("/me/events-feed/unread-count")
	support.RequireStatus(t, resp, http.StatusOK, "reading the administrator unread count")
	resp.Decode(t, &counter)
	if counter.Unread != 2 {
		t.Fatalf("expected two unread administrative entries, got %d", counter.Unread)
	}

	resp = c.Post("/me/events-feed/read", map[string]any{})
	support.RequireStatus(t, resp, http.StatusOK, "marking the administrative feed read")
	resp.Decode(t, &counter)
	if counter.Unread != 0 {
		t.Fatalf("marking all read reported %d unread instead of none", counter.Unread)
	}

	resp = c.Get("/me/events-feed/unread-count")
	support.RequireStatus(t, resp, http.StatusOK, "re-reading the administrator unread count")
	resp.Decode(t, &counter)
	if counter.Unread != 0 {
		t.Fatalf("the counter still reports %d unread after marking all read", counter.Unread)
	}

	var page feedPage
	resp = c.Get("/me/events-feed")
	support.RequireStatus(t, resp, http.StatusOK, "reading the administrator feed")
	resp.Decode(t, &page)
	for _, item := range page.Items {
		if !item.Read {
			t.Fatalf("the feed still lists %s as unread while the counter reports none", item.Type)
		}
	}
}
