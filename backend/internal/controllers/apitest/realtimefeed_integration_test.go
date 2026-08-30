//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
)

type feedPage struct {
	Items []struct {
		ID       uuid.UUID `json:"id"`
		Type     string    `json:"type"`
		Severity string    `json:"severity"`
		Read     bool      `json:"read"`
	} `json:"items"`
	Meta struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

func (s *stack) emit(t *testing.T, req svcrealtime.EmitRequest) *models.SystemEvent {
	t.Helper()
	stored, err := s.feed.Emit(context.Background(), req)
	if err != nil {
		t.Fatalf("emitting a system event: %v", err)
	}
	return stored
}

func TestFeedNeverShowsAnotherPersonsEvents(t *testing.T) {
	s := newStack(t)
	owner := s.register(t, "feed-owner@example.com")
	stranger := s.register(t, "feed-stranger@example.com")

	personal := s.emit(t, svcrealtime.EmitRequest{
		Type:     models.EventRegistrationReminder,
		Severity: models.SeverityInfo,
		Audience: models.AudienceUser,
		UserID:   &owner.ID,
		Payload:  map[string]any{"subject": "a deadline is close"},
	})
	if personal == nil {
		t.Fatal("the personal event was not stored")
	}

	ownerClient := s.session(t, owner)
	var mine feedPage
	resp := ownerClient.get("/me/events-feed")
	requireStatus(t, resp, http.StatusOK, "reading the owner feed")
	resp.decode(t, &mine)
	if mine.Meta.Total != 1 || len(mine.Items) != 1 || mine.Items[0].ID != personal.ID {
		t.Fatalf("the owner did not receive their own event: %s", resp.Body)
	}

	strangerClient := s.session(t, stranger)
	var theirs feedPage
	resp = strangerClient.get("/me/events-feed")
	requireStatus(t, resp, http.StatusOK, "reading the stranger feed")
	resp.decode(t, &theirs)
	if theirs.Meta.Total != 0 || len(theirs.Items) != 0 {
		t.Fatalf("a stranger read somebody else's feed: %s", resp.Body)
	}
}

func TestFeedKeepsAdminEventsFromMembers(t *testing.T) {
	s := newStack(t)
	admin := s.register(t, "feed-admin@example.com")
	s.promote(t, admin.ID)
	member := s.register(t, "feed-member@example.com")

	failure := uuid.New()
	stored := s.emit(t, svcrealtime.EmitRequest{
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

	memberClient := s.session(t, member)
	var theirs feedPage
	resp := memberClient.get("/me/events-feed")
	requireStatus(t, resp, http.StatusOK, "reading the member feed")
	resp.decode(t, &theirs)
	if theirs.Meta.Total != 0 {
		t.Fatalf("a member read the administrative feed: %s", resp.Body)
	}

	adminClient := s.session(t, admin)
	var ours feedPage
	resp = adminClient.get("/me/events-feed")
	requireStatus(t, resp, http.StatusOK, "reading the administrator feed")
	resp.decode(t, &ours)
	if ours.Meta.Total != 1 {
		t.Fatalf("the administrator did not receive the administrative event: %s", resp.Body)
	}
}

func TestMarkReadIgnoresInvisibleIdentifiers(t *testing.T) {
	s := newStack(t)
	owner := s.register(t, "read-owner@example.com")
	stranger := s.register(t, "read-stranger@example.com")

	hidden := s.emit(t, svcrealtime.EmitRequest{
		Type:     models.EventRegistrationReminder,
		Severity: models.SeverityInfo,
		Audience: models.AudienceUser,
		UserID:   &owner.ID,
		Payload:  map[string]any{"subject": "a deadline is close"},
	})

	strangerClient := s.session(t, stranger)
	resp := strangerClient.post("/me/events-feed/read",
		map[string]any{"ids": []uuid.UUID{hidden.ID}})
	requireStatus(t, resp, http.StatusOK, "marking an invisible event read")

	var counter struct {
		Unread int64 `json:"unread"`
	}
	ownerClient := s.session(t, owner)
	resp = ownerClient.get("/me/events-feed/unread-count")
	requireStatus(t, resp, http.StatusOK, "reading the owner unread count")
	resp.decode(t, &counter)
	if counter.Unread != 1 {
		t.Fatalf("a stranger marked somebody else's event read: unread is %d", counter.Unread)
	}
}

func TestUnreadCountFallsAfterMarkingRead(t *testing.T) {
	s := newStack(t)
	owner := s.register(t, "unread-owner@example.com")
	for i := 0; i < 3; i++ {
		s.emit(t, svcrealtime.EmitRequest{
			Type:     models.EventRegistrationReminder,
			Severity: models.SeverityInfo,
			Audience: models.AudienceUser,
			UserID:   &owner.ID,
			Payload:  map[string]any{"index": i},
		})
	}

	c := s.session(t, owner)
	var counter struct {
		Unread int64 `json:"unread"`
	}
	resp := c.get("/me/events-feed/unread-count")
	requireStatus(t, resp, http.StatusOK, "reading the unread count")
	resp.decode(t, &counter)
	if counter.Unread != 3 {
		t.Fatalf("expected three unread entries, got %d", counter.Unread)
	}

	resp = c.post("/me/events-feed/read", map[string]any{})
	requireStatus(t, resp, http.StatusOK, "marking the whole feed read")
	resp.decode(t, &counter)
	if counter.Unread != 0 {
		t.Fatalf("expected an empty unread count after marking all read, got %d", counter.Unread)
	}
}
