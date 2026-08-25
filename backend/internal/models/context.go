package models

import (
	"time"

	"github.com/google/uuid"
)

// Actor — субъект, от имени которого выполняется операция сервиса.
// SYSTEM представлен нулевым UserID (например, планировщик).
type Actor struct {
	UserID    uuid.UUID
	IsAdmin   bool
	RequestID string
}

// SystemActor возвращает актора фоновых процессов.
func SystemActor(requestID string) Actor {
	return Actor{RequestID: requestID}
}

// IsSystem сообщает, что операция выполняется системой, а не человеком.
func (a Actor) IsSystem() bool { return a.UserID == uuid.Nil }

// UserRef возвращает ссылку на пользователя-актора либо nil для системы.
func (a Actor) UserRef() *uuid.UUID {
	if a.IsSystem() {
		return nil
	}
	id := a.UserID
	return &id
}

// Source возвращает источник изменения для журнала статусов.
func (a Actor) Source() ChangeSource {
	switch {
	case a.IsSystem():
		return SourceSystem
	case a.IsAdmin:
		return SourceAdmin
	default:
		return SourceUser
	}
}

// SessionMeta — сведения о клиенте, сохраняемые в сессии.
type SessionMeta struct {
	UserAgent string
	IP        string
}

// TokenPair — выданная пара токенов. Значения передаются клиенту только в cookie.
type TokenPair struct {
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

// Page — параметры страницы выборки.
type Page struct {
	Number int
	Size   int
}

// Offset возвращает смещение выборки.
func (p Page) Offset() int {
	if p.Number < 1 {
		return 0
	}
	return (p.Number - 1) * p.Size
}

// Limit возвращает размер выборки.
func (p Page) Limit() int { return p.Size }

// HackathonFilter — фильтры административного списка хакатонов.
type HackathonFilter struct {
	Search          string
	States          []HackathonState
	IncludeArchived bool
}

// ParticipantFilter — фильтры списка участников хакатона.
type ParticipantFilter struct {
	TeamRole           string
	RegistrationStatus RegistrationStatusValue
	IncludeRemoved     bool
	Search             string
}

// TimelineFilter — фильтры временной шкалы.
type TimelineFilter struct {
	From            time.Time
	To              time.Time
	States          []HackathonState
	ParticipantUser *uuid.UUID
	IncludeArchived bool
}

// AuditFilter — фильтры журнала аудита.
type AuditFilter struct {
	ActorUserID *uuid.UUID
	Action      string
	EntityType  string
	EntityID    *uuid.UUID
	From        *time.Time
	To          *time.Time
}

// MyHackathonFilter — фильтры списка «Мои хакатоны».
type MyHackathonFilter struct {
	IncludeArchived bool
	States          []HackathonState
}
