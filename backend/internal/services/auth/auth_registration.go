package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type registrationName struct {
	first    string
	middle   *string
	last     string
	nickname string
}

func (s *AuthService) validateRegistration(req dto.RegisterRequest) (string, registrationName, string, error) {
	var name registrationName
	email, err := validation.ValidateEmail("email", req.Email)
	if err != nil {
		return "", name, "", err
	}
	first, middle, last, err := validation.PersonName("first_name", "last_name",
		req.FirstName, req.MiddleName, req.LastName)
	if err != nil {
		return "", name, "", err
	}
	nickname, err := validation.RegistrationNickname(req.Nickname)
	if err != nil {
		return "", name, "", err
	}
	name = registrationName{first: first, middle: middle, last: last, nickname: nickname}
	if err := validation.ValidatePassword(req.Password, s.cfg.Auth.MinPasswordLength); err != nil {
		return "", name, "", err
	}
	hash, err := s.hasher.Hash(req.Password)
	if err != nil {
		return "", name, "", err
	}
	return email, name, hash, nil
}

func (s *AuthService) issueVerification(ctx context.Context, userID uuid.UUID) (string, error) {
	secret, err := crypto.NewSecret()
	if err != nil {
		return "", err
	}
	if _, err := s.tokens.Create(ctx, &models.OneTimeToken{
		UserID:    &userID,
		Purpose:   models.PurposeEmailVerification,
		TokenHash: crypto.HashSecret(secret),
		ExpiresAt: s.now().Add(s.cfg.Auth.EmailVerifyTTL),
	}); err != nil {
		return "", err
	}
	return secret, nil
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest,
	meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email, name, hash, err := s.validateRegistration(req)
	if err != nil {
		return nil, nil, err
	}

	var (
		user         *models.User
		verifySecret string
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		taken, err := s.users.EmailTaken(ctx, email, uuid.Nil)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "a user with this email already exists")
		}

		if err := s.checkRegistrationNickname(ctx, name.nickname); err != nil {
			return err
		}

		user, err = s.createUser(ctx, name, email, hash)
		if err != nil {
			return err
		}

		verifySecret, err = s.issueVerification(ctx, user.ID)
		if err != nil {
			return err
		}

		actor := models.Actor{UserID: user.ID, RequestID: ""}
		return s.audit.Record(ctx, actor, models.AuditUserRegister, models.EntityUser, user.ID, nil,
			map[string]any{"email": user.Email, "display_name": user.DisplayName(user.Locale)})
	})
	if err != nil {
		return nil, nil, err
	}

	s.mailer.SendVerification(ctx, user.Email, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		verifySecret, s.cfg.Auth.EmailVerifyTTL, telegramRecipient(user))

	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) checkRegistrationNickname(ctx context.Context, nickname string) error {
	taken, err := s.users.NicknameTaken(ctx, nickname, uuid.Nil)
	if err != nil {
		return err
	}
	if taken {
		return models.NewConflict("nickname_taken", "this nickname is already taken")
	}
	held, err := s.users.NicknameHeld(ctx, nickname, uuid.Nil, s.now())
	if err != nil {
		return err
	}
	if held {
		return models.NewConflict("nickname_held",
			"this nickname was released recently and is still reserved")
	}
	return nil
}

func (s *AuthService) createUser(ctx context.Context, name registrationName,
	email, hash string) (*models.User, error) {
	user, err := s.users.Create(ctx, &models.User{
		FirstName:    name.first,
		MiddleName:   name.middle,
		LastName:     name.last,
		Nickname:     &name.nickname,
		Email:        email,
		PasswordHash: hash,
		IsActive:     true,
	})
	if err != nil && isNicknameConflict(err) {
		return nil, models.NewConflict("nickname_taken", "this nickname is already taken")
	}
	return user, err
}

func isNicknameConflict(err error) bool {
	var domain *models.DomainError
	if !errors.As(err, &domain) {
		return false
	}
	return domain.Code == "unique_violation" &&
		domain.Message == postgres.ConstraintMessage("users_nickname_key")
}
