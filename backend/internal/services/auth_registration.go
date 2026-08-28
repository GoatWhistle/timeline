package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *AuthService) usableInvite(ctx context.Context, token, email string) (*models.Invite, error) {
	if token == "" {
		return nil, nil
	}
	invite, err := s.invites.GetByHash(ctx, HashSecret(token))
	if err != nil {
		return nil, models.NewValidation("invite not found or invalid")
	}
	if !invite.Usable(s.now()) {
		return nil, models.NewConflict("invite_not_usable",
			"the invite has already been used, revoked or expired")
	}
	if invite.NormalizedEmail != email {
		return nil, models.NewValidation("email does not match the invited address")
	}
	return invite, nil
}

func (s *AuthService) validateRegistration(req models.RegisterRequest) (string, string, string, error) {
	email, err := validateEmail("email", req.Email)
	if err != nil {
		return "", "", "", err
	}
	displayName, err := validateText("display_name", req.DisplayName, 1, 120)
	if err != nil {
		return "", "", "", err
	}
	if err := validatePassword(req.Password, s.cfg.Auth.MinPasswordLength); err != nil {
		return "", "", "", err
	}
	hash, err := s.hasher.Hash(req.Password)
	if err != nil {
		return "", "", "", err
	}
	return email, displayName, hash, nil
}

func (s *AuthService) acceptInvite(ctx context.Context, invite *models.Invite, email string) error {
	if invite == nil {
		return nil
	}
	if err := s.invites.MarkAccepted(ctx, invite.ID); err != nil {
		return err
	}
	return s.invites.RevokePendingByEmail(ctx, email)
}

func (s *AuthService) issueVerification(ctx context.Context, userID uuid.UUID) (string, error) {
	secret, err := NewSecret()
	if err != nil {
		return "", err
	}
	if _, err := s.tokens.Create(ctx, &models.OneTimeToken{
		UserID:    &userID,
		Purpose:   models.TokenEmailVerification,
		TokenHash: HashSecret(secret),
		ExpiresAt: s.now().Add(s.cfg.Auth.EmailVerifyTTL),
	}); err != nil {
		return "", err
	}
	return secret, nil
}

func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest,
	meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email, displayName, hash, err := s.validateRegistration(req)
	if err != nil {
		return nil, nil, err
	}

	var (
		user         *models.User
		verifySecret string
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		invite, err := s.usableInvite(ctx, req.InviteToken, email)
		if err != nil {
			return err
		}

		taken, err := s.users.EmailTaken(ctx, email, uuid.Nil)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "a user with this email already exists")
		}

		user, err = s.users.Create(ctx, &models.User{
			DisplayName:  displayName,
			Email:        email,
			PasswordHash: hash,
			IsActive:     true,
		})
		if err != nil {
			return err
		}

		if err := s.acceptInvite(ctx, invite, email); err != nil {
			return err
		}

		verifySecret, err = s.issueVerification(ctx, user.ID)
		if err != nil {
			return err
		}

		actor := models.Actor{UserID: user.ID, RequestID: ""}
		return s.audit.Record(ctx, actor, models.AuditUserRegister, models.EntityUser, user.ID, nil,
			map[string]any{"email": user.Email, "display_name": user.DisplayName})
	})
	if err != nil {
		return nil, nil, err
	}

	s.mailer.SendVerification(ctx, user.Email, user.DisplayName, user.Locale,
		verifySecret, s.cfg.Auth.EmailVerifyTTL)

	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}
