package blobstore

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

type Local struct {
	root string
}

func NewLocal(root string) (*Local, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("resolve blob storage root: %w", err)
	}
	if err := os.MkdirAll(abs, 0o750); err != nil {
		return nil, fmt.Errorf("create blob storage root: %w", err)
	}
	return &Local{root: abs}, nil
}

func (l *Local) path(key string) (string, error) {
	if !ValidKey(key) {
		return "", ErrInvalidKey
	}
	return filepath.Join(l.root, key), nil
}

func (l *Local) Put(_ context.Context, key string, data []byte, _ string) error {
	name, err := l.path(key)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(l.root, ".upload-*")
	if err != nil {
		return fmt.Errorf("create temporary blob: %w", err)
	}
	tmpName := tmp.Name()
	defer func() {
		_ = tmp.Close()
		_ = os.Remove(tmpName)
	}()

	if _, err := tmp.Write(data); err != nil {
		return fmt.Errorf("write blob: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		return fmt.Errorf("sync blob: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close blob: %w", err)
	}
	if err := os.Chmod(tmpName, 0o600); err != nil {
		return fmt.Errorf("chmod blob: %w", err)
	}
	if err := os.Rename(tmpName, name); err != nil {
		return fmt.Errorf("publish blob: %w", err)
	}
	return nil
}

func (l *Local) Open(_ context.Context, key string) (*Blob, error) {
	name, err := l.path(key)
	if err != nil {
		return nil, err
	}
	file, err := os.Open(name)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("open blob: %w", err)
	}
	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("stat blob: %w", err)
	}
	if !info.Mode().IsRegular() {
		_ = file.Close()
		return nil, ErrNotFound
	}
	return &Blob{
		Content:     file,
		ContentType: ContentTypeForKey(key),
		Size:        info.Size(),
	}, nil
}

func (l *Local) Delete(_ context.Context, key string) error {
	name, err := l.path(key)
	if err != nil {
		return err
	}
	if err := os.Remove(name); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete blob: %w", err)
	}
	return nil
}
