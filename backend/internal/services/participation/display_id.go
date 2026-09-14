package participation

import (
	"context"

	"github.com/google/uuid"
)

func (s *ParticipantService) ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *ParticipantService) ResolveParticipantDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.participants.ResolveDisplayID(ctx, displayID)
}

func (s *ParticipantService) ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.users.ResolveDisplayID(ctx, displayID)
}

func (s *StatusService) ResolveParticipantDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.participants.ResolveDisplayID(ctx, displayID)
}

func (s *RegistrationService) ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *StatusService) ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *StatusService) ResolveStatusDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.statuses.ResolveDisplayID(ctx, displayID)
}
