package blobstore

import (
	"context"
	"errors"
	"io"
)

var ErrNotFound = errors.New("blob not found")

type Blob struct {
	Content     io.ReadSeekCloser
	ContentType string
	Size        int64
}

type Store interface {
	Put(ctx context.Context, key string, data []byte, contentType string) error
	Open(ctx context.Context, key string) (*Blob, error)
	Delete(ctx context.Context, key string) error
}
