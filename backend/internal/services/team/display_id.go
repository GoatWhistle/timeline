package team

import (
	"context"

	"github.com/google/uuid"
)

func (s *TeamService) ResolveTeamDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.teams.ResolveDisplayID(ctx, displayID)
}

func (s *TeamService) ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *TeamService) ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.users.ResolveDisplayID(ctx, displayID)
}
