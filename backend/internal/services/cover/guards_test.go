package cover

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/imagefetch"
)

func TestUploadRejectsNonAdmins(t *testing.T) {
	event := models.Event{ID: uuid.New()}
	svc, _, _ := newFixture(t, event, &fakeFetcher{})
	_, err := svc.Upload(context.Background(), models.Actor{UserID: uuid.New()}, event.ID, samplePNG(t))
	if err == nil || !errors.Is(err, models.ErrForbidden) {
		t.Fatalf("Upload as a plain user = %v, want a forbidden error", err)
	}
}

func TestUploadRejectsAFileThatIsNotAnImage(t *testing.T) {
	event := models.Event{ID: uuid.New()}
	svc, _, _ := newFixture(t, event, &fakeFetcher{})
	_, err := svc.Upload(context.Background(), adminActor(), event.ID, []byte("<svg></svg>"))
	if err == nil || !errors.Is(err, models.ErrValidation) {
		t.Fatalf("Upload of a non-image = %v, want a validation error", err)
	}
}

func TestRefreshReportsABlockedWebsiteAsAConflict(t *testing.T) {
	event := models.Event{ID: uuid.New(), WebsiteURL: strPtr("http://127.0.0.1/")}
	fetcher := &fakeFetcher{err: imagefetch.ErrBlockedDestination}
	svc, events, _ := newFixture(t, event, fetcher)

	_, err := svc.Refresh(context.Background(), adminActor(), event.ID)
	if err == nil || !errors.Is(err, models.ErrConflict) {
		t.Fatalf("Refresh of a blocked website = %v, want a conflict", err)
	}
	if events.event.CoverAutoURL != nil {
		t.Fatal("a blocked fetch still wrote a cover")
	}
}

func TestRefreshWithoutAWebsiteIsRejectedBeforeAnyRequest(t *testing.T) {
	event := models.Event{ID: uuid.New()}
	fetcher := &fakeFetcher{}
	svc, _, _ := newFixture(t, event, fetcher)

	if _, err := svc.Refresh(context.Background(), adminActor(), event.ID); err == nil {
		t.Fatal("Refresh without a website succeeded")
	}
	if fetcher.calls != 0 {
		t.Fatalf("the fetcher was called %d times for an event with no website", fetcher.calls)
	}
}
