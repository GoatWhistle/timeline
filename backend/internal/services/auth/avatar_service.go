package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

type AvatarService struct {
	db     *postgres.DB
	users  *identity.Users
	blobs  BlobStore
	audit  *audit.AuditService
	limits config.Avatar
}

func NewAvatarService(db *postgres.DB, users *identity.Users, blobs BlobStore,
	audit *audit.AuditService, limits config.Avatar) *AvatarService {
	return &AvatarService{db: db, users: users, blobs: blobs, audit: audit, limits: limits}
}

func (s *AvatarService) Upload(ctx context.Context, actor models.Actor, data []byte,
) (*models.User, error) {
	image, err := s.inspect(data)
	if err != nil {
		return nil, err
	}

	key, err := s.newKey(image.ContentType)
	if err != nil {
		return nil, err
	}
	if err := s.blobs.Put(ctx, key, data, image.ContentType); err != nil {
		return nil, fmt.Errorf("store avatar: %w", err)
	}

	url := models.AvatarURL(key)
	var updated *models.User
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		updated, err = s.users.UpdateProfile(ctx, actor.UserID, dto.ProfilePatch{AvatarURL: &url})
		if err != nil {
			return err
		}
		s.discard(ctx, models.AvatarKeyFromURL(before.AvatarURL), key)
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"avatar_stored": before.AvatarURL != nil},
			map[string]any{"avatar_stored": true})
	})
	if err != nil {
		s.discard(ctx, key, "")
		return nil, err
	}
	return updated, nil
}

func (s *AvatarService) Remove(ctx context.Context, actor models.Actor) (*models.User, error) {
	var updated *models.User
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if before.AvatarURL == nil {
			return models.NewNotFound("no avatar is set")
		}
		updated, err = s.users.UpdateProfile(ctx, actor.UserID, dto.ProfilePatch{ClearAvatarURL: true})
		if err != nil {
			return err
		}
		s.discard(ctx, models.AvatarKeyFromURL(before.AvatarURL), "")
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"avatar_stored": true}, map[string]any{"avatar_stored": false})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *AvatarService) Open(ctx context.Context, key string) (*blobstore.Blob, error) {
	if !blobstore.ValidKey(key) {
		return nil, models.NewNotFound("avatar not found")
	}
	blob, err := s.blobs.Open(ctx, key)
	if err != nil {
		if errors.Is(err, blobstore.ErrNotFound) || errors.Is(err, blobstore.ErrInvalidKey) {
			return nil, models.NewNotFound("avatar not found")
		}
		return nil, err
	}
	return blob, nil
}

func (s *AvatarService) inspect(data []byte) (blobstore.Image, error) {
	if len(data) == 0 {
		return blobstore.Image{}, models.NewValidation("the uploaded file is empty",
			models.FieldError{Field: "file", Message: "an image file is required"})
	}
	if int64(len(data)) > s.limits.MaxBytes {
		return blobstore.Image{}, models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: fmt.Sprintf("at most %d bytes", s.limits.MaxBytes)})
	}
	image, err := blobstore.InspectImage(data)
	if err != nil {
		return blobstore.Image{}, models.NewValidation("the file is not a supported image",
			models.FieldError{Field: "file", Message: "only PNG, JPEG and WebP images are accepted"})
	}
	if image.Width > s.limits.MaxDimension || image.Height > s.limits.MaxDimension {
		return blobstore.Image{}, models.NewValidation("the image is too large",
			models.FieldError{Field: "file",
				Message: fmt.Sprintf("at most %d pixels on each side", s.limits.MaxDimension)})
	}
	return image, nil
}

func (s *AvatarService) newKey(contentType string) (string, error) {
	ext := blobstore.ExtensionFor(contentType)
	if ext == "" {
		return "", models.NewValidation("the file is not a supported image",
			models.FieldError{Field: "file", Message: "only PNG, JPEG and WebP images are accepted"})
	}
	secret, err := crypto.NewSecret()
	if err != nil {
		return "", err
	}
	key := secret + "." + ext
	if !blobstore.ValidKey(key) {
		return "", fmt.Errorf("generated avatar key is not storable")
	}
	return key, nil
}

func (s *AvatarService) discard(ctx context.Context, key, keep string) {
	if key == "" || key == keep {
		return
	}
	if err := s.blobs.Delete(ctx, key); err != nil {
		slog.ErrorContext(ctx, "failed to delete avatar file", "error", err)
	}
}

func (s *AvatarService) DeleteForUser(ctx context.Context, userID uuid.UUID, url *string) {
	s.discard(ctx, models.AvatarKeyFromURL(url), "")
}
