// Package services содержит бизнес-логику приложения и границы транзакций.
// Слой не знает про HTTP и не выполняет SQL напрямую.
package services

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/argon2"

	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// PasswordHasher считает и проверяет хеши паролей по схеме Argon2id.
type PasswordHasher struct{ cfg config.Argon }

// NewPasswordHasher создаёт хешер с параметрами конфигурации безопасности.
func NewPasswordHasher(cfg config.Argon) *PasswordHasher { return &PasswordHasher{cfg: cfg} }

// Hash возвращает хеш пароля в формате PHC.
func (h *PasswordHasher) Hash(password string) (string, error) {
	salt := make([]byte, h.cfg.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("генерация соли: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, h.cfg.Iterations, h.cfg.Memory, h.cfg.Parallelism, h.cfg.KeyLength)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, h.cfg.Memory, h.cfg.Iterations, h.cfg.Parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key)), nil
}

// Verify сравнивает пароль с сохранённым хешем за постоянное время.
func (h *PasswordHasher) Verify(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false
	}
	var memory, iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(expected)))
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

// NewSecret возвращает криптостойкий одноразовый секрет для токенов и ссылок.
func NewSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("генерация секрета: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// HashSecret возвращает хеш секрета: в базе хранится только он.
func HashSecret(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}

// TokenIssuer выпускает и проверяет access token.
type TokenIssuer struct {
	secret []byte
	ttl    time.Duration
}

// NewTokenIssuer создаёт издателя access token.
func NewTokenIssuer(cfg config.Auth) *TokenIssuer {
	return &TokenIssuer{secret: []byte(cfg.JWTSecret), ttl: cfg.AccessTTL}
}

// accessClaims — полезная нагрузка access token. Прав в токене нет: роль
// проверяется по актуальной записи пользователя при каждом запросе.
type accessClaims struct {
	jwt.RegisteredClaims
	SessionID string `json:"sid"`
}

// Issue выпускает access token для пользователя и сессии.
func (t *TokenIssuer) Issue(userID, sessionID uuid.UUID, now time.Time) (string, time.Time, error) {
	expires := now.Add(t.ttl)
	claims := accessClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expires),
			ID:        uuid.NewString(),
		},
		SessionID: sessionID.String(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("подпись access token: %w", err)
	}
	return signed, expires, nil
}

// Parse проверяет подпись и срок действия access token.
func (t *TokenIssuer) Parse(token string) (userID uuid.UUID, sessionID uuid.UUID, err error) {
	parsed, err := jwt.ParseWithClaims(token, &accessClaims{}, func(tk *jwt.Token) (any, error) {
		if _, ok := tk.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("неожиданный метод подписи")
		}
		return t.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return uuid.Nil, uuid.Nil, models.NewUnauthorized("access token недействителен")
	}
	claims, ok := parsed.Claims.(*accessClaims)
	if !ok || !parsed.Valid {
		return uuid.Nil, uuid.Nil, models.NewUnauthorized("access token недействителен")
	}
	userID, err = uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, uuid.Nil, models.NewUnauthorized("access token недействителен")
	}
	sessionID, err = uuid.Parse(claims.SessionID)
	if err != nil {
		return uuid.Nil, uuid.Nil, models.NewUnauthorized("access token недействителен")
	}
	return userID, sessionID, nil
}
