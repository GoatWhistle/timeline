package cover

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/imagefetch"
)

type directRunner struct{}

func (directRunner) WithTx(ctx context.Context, fn func(context.Context) error) error {
	return fn(ctx)
}

type silentRecorder struct{ actions []models.AuditAction }

func (r *silentRecorder) Record(_ context.Context, _ models.Actor, action models.AuditAction,
	_ models.EntityType, _ uuid.UUID, _, _ any) error {
	r.actions = append(r.actions, action)
	return nil
}

type fakeEvents struct {
	event models.Event
}

func (f *fakeEvents) GetByID(_ context.Context, _ uuid.UUID) (*models.Event, error) {
	copied := f.event
	return &copied, nil
}

func (f *fakeEvents) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return f.GetByID(ctx, id)
}

func (f *fakeEvents) ResolveDisplayID(_ context.Context, _ string) (uuid.UUID, error) {
	return f.event.ID, nil
}

func (f *fakeEvents) SetManualCover(_ context.Context, _ uuid.UUID, url *string) (*models.Event, error) {
	f.event.CoverManualURL = url
	copied := f.event
	return &copied, nil
}

func (f *fakeEvents) SetAutoCover(_ context.Context, _ uuid.UUID, url, source *string,
	fetchedAt *time.Time) (*models.Event, error) {
	f.event.CoverAutoURL = url
	f.event.CoverAutoSource = source
	f.event.CoverAutoFetchedAt = fetchedAt
	copied := f.event
	return &copied, nil
}

type fakeFetcher struct {
	cover *imagefetch.Cover
	err   error
	calls int
}

func (f *fakeFetcher) FetchCover(_ context.Context, _ string) (*imagefetch.Cover, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.cover, nil
}

func samplePNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 6, 4))
	img.Set(0, 0, color.RGBA{R: 9, G: 9, B: 9, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func newFixture(t *testing.T, event models.Event, fetcher Fetcher) (*Service, *fakeEvents, *blobstore.Local) {
	t.Helper()
	store, err := blobstore.NewLocal(t.TempDir())
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}
	events := &fakeEvents{event: event}
	svc := NewService(directRunner{}, events, store, fetcher, &silentRecorder{}, config.Cover{
		MaxBytes:     5 << 20,
		MaxDimension: 4096,
		FetchEnabled: true,
		FetchTimeout: time.Second,
	})
	return svc, events, store
}

func adminActor() models.Actor {
	return models.Actor{UserID: uuid.New(), IsAdmin: true}
}

func TestAutomaticFetchNeverOverwritesTheUploadedCover(t *testing.T) {
	event := models.Event{
		ID:             uuid.New(),
		WebsiteURL:     strPtr("https://example.com"),
		CoverManualURL: strPtr("/api/v1/covers/manual.png"),
	}
	fetcher := &fakeFetcher{cover: &imagefetch.Cover{
		Data: samplePNG(t), ContentType: blobstore.TypePNG,
		SourceURL: "https://example.com/og.png", Width: 6, Height: 4,
	}}
	svc, events, _ := newFixture(t, event, fetcher)

	updated, err := svc.Refresh(context.Background(), adminActor(), event.ID)
	if err != nil {
		t.Fatalf("Refresh = %v, want nil", err)
	}
	if events.event.CoverManualURL == nil || *events.event.CoverManualURL != "/api/v1/covers/manual.png" {
		t.Fatalf("the uploaded cover changed to %v", events.event.CoverManualURL)
	}
	if events.event.CoverAutoURL == nil {
		t.Fatal("the fetched cover was not stored alongside the uploaded one")
	}
	effective := updated.EffectiveCoverURL()
	if effective == nil || *effective != "/api/v1/covers/manual.png" {
		t.Fatalf("effective cover = %v, want the uploaded one to keep winning", effective)
	}
}

func TestAutomaticFetchReplacesThePreviousAutomaticCover(t *testing.T) {
	event := models.Event{
		ID:           uuid.New(),
		WebsiteURL:   strPtr("https://example.com"),
		CoverAutoURL: strPtr("/api/v1/covers/old.png"),
	}
	fetcher := &fakeFetcher{cover: &imagefetch.Cover{
		Data: samplePNG(t), ContentType: blobstore.TypePNG,
		SourceURL: "https://example.com/new.png", Width: 6, Height: 4,
	}}
	svc, events, store := newFixture(t, event, fetcher)
	if err := store.Put(context.Background(), "old.png", []byte("old"), blobstore.TypePNG); err != nil {
		t.Fatalf("seed old cover: %v", err)
	}

	if _, err := svc.Refresh(context.Background(), adminActor(), event.ID); err != nil {
		t.Fatalf("Refresh = %v, want nil", err)
	}
	if events.event.CoverAutoURL == nil || *events.event.CoverAutoURL == "/api/v1/covers/old.png" {
		t.Fatalf("the automatic cover was not replaced: %v", events.event.CoverAutoURL)
	}
	if _, err := store.Open(context.Background(), "old.png"); !errors.Is(err, blobstore.ErrNotFound) {
		t.Fatalf("the replaced automatic file was not deleted: %v", err)
	}
}

func TestUploadedCoverSurvivesAndKeepsTheFetchedOneOnDisk(t *testing.T) {
	event := models.Event{
		ID:           uuid.New(),
		CoverAutoURL: strPtr("/api/v1/covers/auto.png"),
	}
	svc, events, store := newFixture(t, event, &fakeFetcher{})
	if err := store.Put(context.Background(), "auto.png", []byte("auto"), blobstore.TypePNG); err != nil {
		t.Fatalf("seed auto cover: %v", err)
	}

	updated, err := svc.Upload(context.Background(), adminActor(), event.ID, samplePNG(t))
	if err != nil {
		t.Fatalf("Upload = %v, want nil", err)
	}
	if events.event.CoverAutoURL == nil {
		t.Fatal("uploading dropped the automatic cover, so removing the upload would leave nothing")
	}
	if _, err := store.Open(context.Background(), "auto.png"); err != nil {
		t.Fatalf("uploading deleted the automatic file: %v", err)
	}
	source := updated.EffectiveCoverSource()
	if source == nil || *source != models.CoverSourceManual {
		t.Fatalf("effective source after upload = %v, want MANUAL", source)
	}
}

func TestRemovingTheUploadedCoverRestoresTheFetchedOne(t *testing.T) {
	event := models.Event{
		ID:             uuid.New(),
		CoverManualURL: strPtr("/api/v1/covers/manual.png"),
		CoverAutoURL:   strPtr("/api/v1/covers/auto.png"),
	}
	svc, _, store := newFixture(t, event, &fakeFetcher{})
	if err := store.Put(context.Background(), "manual.png", []byte("m"), blobstore.TypePNG); err != nil {
		t.Fatalf("seed manual cover: %v", err)
	}

	updated, err := svc.Remove(context.Background(), adminActor(), event.ID)
	if err != nil {
		t.Fatalf("Remove = %v, want nil", err)
	}
	effective := updated.EffectiveCoverURL()
	if effective == nil || *effective != "/api/v1/covers/auto.png" {
		t.Fatalf("effective cover after removal = %v, want the fetched one", effective)
	}
	if _, err := store.Open(context.Background(), "manual.png"); !errors.Is(err, blobstore.ErrNotFound) {
		t.Fatalf("the removed upload is still on disk: %v", err)
	}
}

func strPtr(value string) *string { return &value }
