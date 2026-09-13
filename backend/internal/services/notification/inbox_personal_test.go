package notification

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func personalNotice(kind models.NotificationType) models.PersonalNotice {
	return models.PersonalNotice{
		Type:            kind,
		RecipientID:     uuid.New(),
		RecipientLocale: "en",
		EventTitle:      "Spring Hack",
		EventDisplayID:  "ev_gma9hq8a96q5",
		Subject:         "Your weekly digest",
		Body:            "Two deadlines are approaching.",
		LogicalKeyBase:  "digest:2026-W12:" + uuid.NewString(),
	}
}

func personalService(t *testing.T, fake *fakeInbox) *NotificationService {
	t.Helper()
	return &NotificationService{cfg: testConfig(t), inbox: fake,
		now: func() time.Time { return time.Now().UTC() }}
}

func TestPersonalNotificationsAlsoReachTheInbox(t *testing.T) {
	for _, kind := range []models.NotificationType{
		models.NotificationWeeklyDigest,
		models.NotificationPersonalTaskDue,
		models.NotificationRetrospectiveDue,
	} {
		fake := &fakeInbox{}
		notice := personalNotice(kind)

		personalService(t, fake).writePersonalInboxItem(context.Background(), notice)

		if len(fake.items) != 1 {
			t.Fatalf("%s: items created = %d, want 1", kind, len(fake.items))
		}
		item := fake.items[0]
		if item.RecipientUserID != notice.RecipientID {
			t.Errorf("%s: recipient = %v, want %v", kind, item.RecipientUserID, notice.RecipientID)
		}
		if item.Title != notice.Subject {
			t.Errorf("%s: title = %q, want %q", kind, item.Title, notice.Subject)
		}
		if item.BodyMD != notice.Body {
			t.Errorf("%s: body_md = %q, want %q", kind, item.BodyMD, notice.Body)
		}
		if item.LogicalKey != "inbox:"+notice.LogicalKeyBase {
			t.Errorf("%s: logical key = %q", kind, item.LogicalKey)
		}
	}
}

func TestPersonalInboxKindsAreDistinctPerOccasion(t *testing.T) {
	seen := map[string]models.NotificationType{}
	for _, kind := range []models.NotificationType{
		models.NotificationWeeklyDigest,
		models.NotificationPersonalTaskDue,
		models.NotificationRetrospectiveDue,
	} {
		fake := &fakeInbox{}
		personalService(t, fake).writePersonalInboxItem(context.Background(), personalNotice(kind))

		name := fake.items[0].Kind
		if previous, clash := seen[name]; clash {
			t.Fatalf("%s and %s both write the inbox kind %q", previous, kind, name)
		}
		seen[name] = kind
	}
}

func TestPersonalInboxItemOffersAWayToOpenTheEvent(t *testing.T) {
	fake := &fakeInbox{}
	notice := personalNotice(models.NotificationPersonalTaskDue)

	personalService(t, fake).writePersonalInboxItem(context.Background(), notice)

	item := fake.items[0]
	if len(item.Actions) != 1 || item.Actions[0].Kind != models.InboxActionOpen {
		t.Fatalf("a personal item must offer exactly one open action, got %+v", item.Actions)
	}
	if item.Actions[0].Href == nil || *item.Actions[0].Href == "" {
		t.Fatal("the open action carries no destination")
	}
	if *item.Actions[0].Href != notice.EventDisplayID {
		t.Errorf("href = %q, want the external event identifier %q",
			*item.Actions[0].Href, notice.EventDisplayID)
	}
}
