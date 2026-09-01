package blobstore

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func newStore(t *testing.T) (*Local, string) {
	t.Helper()
	root := t.TempDir()
	store, err := NewLocal(root)
	if err != nil {
		t.Fatalf("NewLocal returned %v", err)
	}
	return store, root
}

func TestLocalPutOpenDelete(t *testing.T) {
	store, _ := newStore(t)
	ctx := context.Background()
	payload := []byte("binary-content")

	if err := store.Put(ctx, "abc.png", payload, TypePNG); err != nil {
		t.Fatalf("Put returned %v", err)
	}
	blob, err := store.Open(ctx, "abc.png")
	if err != nil {
		t.Fatalf("Open returned %v", err)
	}
	got, err := io.ReadAll(blob.Content)
	blob.Content.Close()
	if err != nil {
		t.Fatalf("reading blob: %v", err)
	}
	if string(got) != string(payload) {
		t.Fatalf("read %q, want %q", got, payload)
	}
	if blob.ContentType != TypePNG {
		t.Fatalf("content type %q, want %q", blob.ContentType, TypePNG)
	}

	if err := store.Delete(ctx, "abc.png"); err != nil {
		t.Fatalf("Delete returned %v", err)
	}
	if _, err := store.Open(ctx, "abc.png"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Open after delete returned %v, want ErrNotFound", err)
	}
}

func TestLocalDeleteIsIdempotent(t *testing.T) {
	store, _ := newStore(t)
	if err := store.Delete(context.Background(), "missing.png"); err != nil {
		t.Fatalf("deleting an absent blob returned %v, want nil", err)
	}
}

func TestLocalRefusesKeysOutsideRoot(t *testing.T) {
	store, root := newStore(t)
	ctx := context.Background()
	outside := filepath.Join(filepath.Dir(root), "escaped.txt")

	for _, key := range []string{"../escaped.txt", "a/b.png", `..\escaped.txt`, "/etc/passwd"} {
		if err := store.Put(ctx, key, []byte("owned"), TypePNG); !errors.Is(err, ErrInvalidKey) {
			t.Errorf("Put(%q) returned %v, want ErrInvalidKey", key, err)
		}
		if _, err := store.Open(ctx, key); !errors.Is(err, ErrInvalidKey) {
			t.Errorf("Open(%q) returned %v, want ErrInvalidKey", key, err)
		}
		if err := store.Delete(ctx, key); !errors.Is(err, ErrInvalidKey) {
			t.Errorf("Delete(%q) returned %v, want ErrInvalidKey", key, err)
		}
	}
	if _, err := os.Stat(outside); !os.IsNotExist(err) {
		t.Fatal("a file was written outside the storage root")
	}
}

func TestLocalPutReplacesExistingBlob(t *testing.T) {
	store, root := newStore(t)
	ctx := context.Background()

	if err := store.Put(ctx, "same.png", []byte("first"), TypePNG); err != nil {
		t.Fatalf("first Put returned %v", err)
	}
	if err := store.Put(ctx, "same.png", []byte("second"), TypePNG); err != nil {
		t.Fatalf("second Put returned %v", err)
	}
	got, err := os.ReadFile(filepath.Join(root, "same.png"))
	if err != nil {
		t.Fatalf("reading replaced blob: %v", err)
	}
	if string(got) != "second" {
		t.Fatalf("blob is %q, want the replacement", got)
	}

	entries, err := os.ReadDir(root)
	if err != nil {
		t.Fatalf("listing root: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("root holds %d entries, want 1 with no temporary left behind", len(entries))
	}
}
