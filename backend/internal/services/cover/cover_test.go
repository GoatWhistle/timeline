package cover

import (
	"context"
	"errors"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

func newStoreService(t *testing.T) (*Service, *blobstore.Local) {
	t.Helper()
	store, err := blobstore.NewLocal(t.TempDir())
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}
	return &Service{blobs: store}, store
}

func putBlob(t *testing.T, store *blobstore.Local, key string) {
	t.Helper()
	if err := store.Put(context.Background(), key, []byte("stored"), blobstore.TypePNG); err != nil {
		t.Fatalf("put %s: %v", key, err)
	}
}

func exists(t *testing.T, store *blobstore.Local, key string) bool {
	t.Helper()
	blob, err := store.Open(context.Background(), key)
	if err == nil {
		blob.Content.Close()
		return true
	}
	if errors.Is(err, blobstore.ErrNotFound) {
		return false
	}
	t.Fatalf("open %s: %v", key, err)
	return false
}

func TestDeleteForEventRemovesBothStoredCovers(t *testing.T) {
	svc, store := newStoreService(t)
	putBlob(t, store, "manual.png")
	putBlob(t, store, "auto.png")
	putBlob(t, store, "unrelated.png")

	svc.DeleteForEvent(context.Background(), models.EventCoverKeys{
		Manual: "manual.png", Auto: "auto.png",
	})

	if exists(t, store, "manual.png") {
		t.Fatal("the uploaded cover survived event deletion")
	}
	if exists(t, store, "auto.png") {
		t.Fatal("the fetched cover survived event deletion")
	}
	if !exists(t, store, "unrelated.png") {
		t.Fatal("event deletion removed a file belonging to another event")
	}
}

func TestDeleteForEventHandlesAnEventWithOnlyOneCover(t *testing.T) {
	svc, store := newStoreService(t)
	putBlob(t, store, "auto.png")

	svc.DeleteForEvent(context.Background(), models.EventCoverKeys{Auto: "auto.png"})

	if exists(t, store, "auto.png") {
		t.Fatal("the fetched cover survived event deletion")
	}
}

func TestDeleteForEventOnAnEventWithoutCoversIsHarmless(t *testing.T) {
	svc, store := newStoreService(t)
	putBlob(t, store, "other.png")

	svc.DeleteForEvent(context.Background(), models.EventCoverKeys{})

	if !exists(t, store, "other.png") {
		t.Fatal("deleting an event without covers removed an unrelated file")
	}
}

func TestDiscardKeepsTheReplacementFile(t *testing.T) {
	svc, store := newStoreService(t)
	putBlob(t, store, "same.png")

	svc.discard(context.Background(), "same.png", "same.png")

	if !exists(t, store, "same.png") {
		t.Fatal("discard removed the file it was told to keep")
	}
}
