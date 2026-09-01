package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

type BlobStore interface {
	Put(ctx context.Context, key string, data []byte, contentType string) error
	Open(ctx context.Context, key string) (*blobstore.Blob, error)
	Delete(ctx context.Context, key string) error
}

type AvatarPurger interface {
	DeleteForUser(ctx context.Context, userID uuid.UUID, url *string)
}

func (s *UserService) WithAvatars(a AvatarPurger) { s.avatars = a }

func (s *ProfileService) WithAvatars(a AvatarPurger) { s.avatars = a }
