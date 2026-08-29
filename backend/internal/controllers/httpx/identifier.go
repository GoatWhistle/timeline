package httpx

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type DisplayResolver func(ctx context.Context, displayID string) (uuid.UUID, error)

func PathDisplayID(r *http.Request, name string, kind models.DisplayKind,
	resolve DisplayResolver) (uuid.UUID, error) {
	parsed, err := models.ParseDisplayID(kind, r.PathValue(name))
	if err != nil {
		return uuid.Nil, err
	}
	id, err := resolve(r.Context(), parsed.Value)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

func BodyDisplayID(ctx context.Context, raw *string, kind models.DisplayKind,
	resolve DisplayResolver) (*uuid.UUID, error) {
	if raw == nil {
		return nil, nil
	}
	parsed, err := models.ParseDisplayID(kind, *raw)
	if err != nil {
		return nil, err
	}
	id, err := resolve(ctx, parsed.Value)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func BodyDisplayIDs(ctx context.Context, raw []string, kind models.DisplayKind,
	resolve DisplayResolver) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, len(raw))
	for _, value := range raw {
		parsed, err := models.ParseDisplayID(kind, value)
		if err != nil {
			return nil, err
		}
		id, err := resolve(ctx, parsed.Value)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}
