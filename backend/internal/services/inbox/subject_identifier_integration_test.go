//go:build integration

package inbox_test

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestInboxSubjectIsReportedByItsExternalIdentifier(t *testing.T) {
	db, svc, _ := setup(t)
	ctx := context.Background()
	userID := newTestUser(t, db)

	eventID := uuid.New()
	href := "ev_gma9hq8a96q5"
	_, err := db.Pool().Exec(ctx, `
		INSERT INTO inbox_items (recipient_user_id, kind, title, body_md, logical_key,
			subject_type, subject_id, actions_json)
		VALUES ($1, 'notification.primary', 'Title', 'Body', $2, 'event', $3, $4::jsonb)`,
		userID, "subject-external-"+uuid.NewString(), eventID,
		`[{"kind":"OPEN","href":"`+href+`"}]`)
	if err != nil {
		t.Fatalf("seeding an inbox item with a subject: %v", err)
	}

	items, _, err := svc.List(ctx, models.Actor{UserID: userID}, false, models.Page{Number: 1, Size: 50})
	if err != nil {
		t.Fatalf("listing the inbox: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("listed %d items, want 1", len(items))
	}

	subject := items[0].Subject
	if subject == nil {
		t.Fatal("an item carrying a subject reported none")
	}
	if strings.Contains(subject.ID, eventID.String()) {
		t.Fatalf("the subject leaks the internal uuid %q", subject.ID)
	}
	if subject.ID != href {
		t.Fatalf("subject id = %q, want the external identifier %q", subject.ID, href)
	}
}
