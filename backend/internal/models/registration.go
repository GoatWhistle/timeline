package models

import (
	"time"

	"github.com/google/uuid"
)

// Registration — единственная логическая регистрация хакатона (раздел 7 ТЗ).
type Registration struct {
	ID          uuid.UUID `json:"id"`
	HackathonID uuid.UUID `json:"hackathon_id"`
	URL         string    `json:"url"`
	DeadlineAt  time.Time `json:"deadline_at"`
	// HackathonEndAt — денормализованная копия Hackathon.end_at. Поддерживается
	// составным внешним ключом с ON UPDATE CASCADE и приложением не изменяется.
	HackathonEndAt time.Time         `json:"-"`
	Description    *string           `json:"description,omitempty"`
	State          RegistrationState `json:"state"`
	// ScheduleVersion меняется при изменении дедлайна и полей расписания правил.
	ScheduleVersion int `json:"schedule_version"`
	// ActivationVersion увеличивается при переходе DISABLED → ACTIVE.
	ActivationVersion int `json:"activation_version"`
	// NotificationContentVersion увеличивается при изменении URL.
	NotificationContentVersion int       `json:"notification_content_version"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
}

// Active сообщает, что регистрация активна.
func (r *Registration) Active() bool { return r.State == RegistrationActive }

// RegistrationStatus — заявленный статус внешней регистрации участника (раздел 8 ТЗ).
type RegistrationStatus struct {
	ID          uuid.UUID `json:"id"`
	HackathonID uuid.UUID `json:"hackathon_id"`
	// RegistrationID и ParticipantID обязаны принадлежать одному хакатону;
	// целостность обеспечивается составными внешними ключами.
	RegistrationID      uuid.UUID               `json:"registration_id"`
	ParticipantID       uuid.UUID               `json:"participant_id"`
	Status              RegistrationStatusValue `json:"status"`
	TodoCycle           int                     `json:"todo_cycle"`
	RegisteredAt        *time.Time              `json:"registered_at,omitempty"`
	LastChangeSource    ChangeSource            `json:"last_change_source"`
	LastChangedByUserID *uuid.UUID              `json:"last_changed_by_user_id,omitempty"`
	Note                *string                 `json:"note,omitempty"`
	CreatedAt           time.Time               `json:"created_at"`
	UpdatedAt           time.Time               `json:"updated_at"`
}

// NotificationRule — правило напоминания относительно дедлайна (раздел 9.1 ТЗ).
type NotificationRule struct {
	ID             uuid.UUID `json:"id"`
	RegistrationID uuid.UUID `json:"registration_id"`
	// OffsetMinutes знаковый: положительное значение — до дедлайна,
	// 0 — в момент дедлайна, отрицательное — после дедлайна (просрочка).
	OffsetMinutes   int       `json:"offset_minutes"`
	Enabled         bool      `json:"enabled"`
	SlotNo          int       `json:"slot_no"`
	ChannelOverride *Channel  `json:"channel_override,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// NotificationType возвращает тип уведомления, порождаемого правилом.
// Отдельного поля типа у правила нет — он определяется знаком смещения.
func (r *NotificationRule) NotificationType() NotificationType {
	if r.OffsetMinutes < 0 {
		return NotificationOverdue
	}
	return NotificationReminder
}

// TriggerAt возвращает момент срабатывания правила для указанного дедлайна.
// Формула едина для обоих знаков: now >= deadline_at - offset_minutes.
func (r *NotificationRule) TriggerAt(deadline time.Time) time.Time {
	return deadline.Add(-time.Duration(r.OffsetMinutes) * time.Minute)
}
