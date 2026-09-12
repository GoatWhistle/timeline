package notification

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type fakeInbox struct {
	items []*models.InboxItem
}

func (f *fakeInbox) Create(_ context.Context, item *models.InboxItem) error {
	f.items = append(f.items, item)
	return nil
}

func candidateWithEvent(recipientLocale string) models.ReconcileCandidate {
	c := candidate(recipientLocale)
	c.EventID = uuid.New()
	c.EventDisplayID = "ev_gma9hq8a96q5"
	return c
}

func TestWriteInboxItemUsesInboxCatalogAndLinksTheEvent(t *testing.T) {
	fake := &fakeInbox{}
	svc := &NotificationService{cfg: testConfig(t), inbox: fake,
		now: func() time.Time { return time.Now().UTC() }}
	c := candidateWithEvent("en")

	svc.writeInboxItem(context.Background(), models.NotificationRequired, c, "logical-key-1")

	if len(fake.items) != 1 {
		t.Fatalf("items created = %d, want 1", len(fake.items))
	}
	item := fake.items[0]
	if item.RecipientUserID != c.RecipientID {
		t.Errorf("recipient = %v, want %v", item.RecipientUserID, c.RecipientID)
	}
	if item.LogicalKey != "logical-key-1" {
		t.Errorf("logical key = %q", item.LogicalKey)
	}
	if item.SubjectType == nil || *item.SubjectType != "event" || item.SubjectID == nil || *item.SubjectID != c.EventID {
		t.Errorf("subject not wired to the event: %+v", item)
	}
	if item.Title == "" || item.BodyMD == "" {
		t.Error("title/body_md must not be empty")
	}
	if item.Title == "logical-key-1" {
		t.Error("title fell back to the raw locale key, catalog lookup failed")
	}

	foundOpen, foundMark := false, false
	for _, a := range item.Actions {
		if a.Kind == models.InboxActionOpen {
			foundOpen = true
			if a.Href == nil || *a.Href == "" {
				t.Error("OPEN action must carry an href")
			}
		}
		if a.Kind == models.InboxActionMarkRegistered {
			foundMark = true
		}
	}
	if !foundOpen || !foundMark {
		t.Errorf("expected OPEN and MARK_REGISTERED actions, got %+v", item.Actions)
	}
}

func TestWriteInboxItemRendersInRecipientLanguage(t *testing.T) {
	fakeEN := &fakeInbox{}
	svcEN := &NotificationService{cfg: testConfig(t), inbox: fakeEN,
		now: func() time.Time { return time.Now().UTC() }}
	svcEN.writeInboxItem(context.Background(), models.NotificationRequired, candidateWithEvent("en"), "k-en")

	fakeRU := &fakeInbox{}
	svcRU := &NotificationService{cfg: testConfig(t), inbox: fakeRU,
		now: func() time.Time { return time.Now().UTC() }}
	svcRU.writeInboxItem(context.Background(), models.NotificationRequired, candidateWithEvent("ru"), "k-ru")

	if fakeEN.items[0].Title == fakeRU.items[0].Title {
		t.Error("Russian recipient received the English inbox title")
	}
}

func TestWriteInboxItemNoopsWithoutInboxWriter(t *testing.T) {
	svc := &NotificationService{cfg: testConfig(t), now: func() time.Time { return time.Now().UTC() }}
	svc.writeInboxItem(context.Background(), models.NotificationRequired, candidateWithEvent("en"), "k")
}

func TestInboxPrimaryKeyDiffersFromChannelPrimaryKey(t *testing.T) {
	c := candidateWithEvent("en")
	c.ParticipantID = uuid.New()
	key := inboxPrimaryKey(c)
	channelKey := PrimaryKey(c.ParticipantID, c.AssignmentVersion, c.ActivationVersion, c.ContentVersion,
		models.ChannelEmail)
	if key == channelKey {
		t.Error("inbox logical key must not collide with the per-channel notification logical key")
	}
}
