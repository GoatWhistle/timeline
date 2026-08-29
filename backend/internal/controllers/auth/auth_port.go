package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type AuthService interface {
	Register(
		ctx context.Context, req models.RegisterRequest, meta models.SessionMeta,
	) (*models.User, *models.TokenPair, error)
	Login(
		ctx context.Context, req models.LoginRequest, meta models.SessionMeta,
	) (*models.User, *models.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string, meta models.SessionMeta) (*models.User, *models.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	LogoutAll(ctx context.Context, actor models.Actor) error
	ResolveSessionDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	ListSessions(ctx context.Context, actor models.Actor) ([]models.SessionResponse, error)
	RevokeSession(ctx context.Context, actor models.Actor, sessionID uuid.UUID) (bool, error)
	VerifyEmail(ctx context.Context, token string) error
	ResendVerification(ctx context.Context, email string) error
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, password string) error
	ConfirmEmailChange(ctx context.Context, token string) error
}
