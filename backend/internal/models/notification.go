package models

import (
	"time"

	"github.com/google/uuid"
)

// NotificationPayload — неизменяемый снимок содержимого уведомления
// на момент создания (раздел 9.6 ТЗ).
type NotificationPayload struct {
	HackathonTitle  string    `json:"hackathon_title"`
	RegistrationURL string    `json:"registration_url"`
	DeadlineUTC     time.Time `json:"deadline_utc"`
	DeadlineLocal   string    `json:"deadline_local"`
	TimezoneID      string    `json:"timezone_id"`
	Type            string    `json:"type"`
	Subject         string    `json:"subject"`
	Body            string    `json:"body"`
}

// Notification — запись очереди доставки (раздел 9.2 ТЗ).
type Notification struct {
	ID               uuid.UUID        `json:"id"`
	NotificationType NotificationType `json:"notification_type"`
	// RecipientUserID — неизменяемый снимок получателя.
	RecipientUserID      uuid.UUID  `json:"recipient_user_id"`
	RegistrationStatusID uuid.UUID  `json:"registration_status_id"`
	RuleID               *uuid.UUID `json:"rule_id,omitempty"`

	ScheduleVersion   *int `json:"schedule_version,omitempty"`
	TodoCycle         *int `json:"todo_cycle,omitempty"`
	AssignmentVersion *int `json:"assignment_version,omitempty"`
	ActivationVersion *int `json:"activation_version,omitempty"`
	// NotificationContentVersion обязателен для всех типов.
	NotificationContentVersion int `json:"notification_content_version"`

	LogicalKey string `json:"logical_key"`
	// RequestedChannel — канал, выбранный правилами раздела 10 при создании.
	RequestedChannel Channel `json:"requested_channel"`
	// ActualChannel — канал последнего выполненного вызова провайдера.
	ActualChannel *Channel `json:"actual_channel,omitempty"`
	// FailedChannels — каналы, закрытые постоянной ошибкой провайдера.
	FailedChannels []Channel `json:"failed_channels,omitempty"`

	Status      NotificationStatus `json:"status"`
	ScheduledAt time.Time          `json:"scheduled_at"`
	// NextAttemptAt — момент, начиная с которого запись готова к обработке.
	NextAttemptAt *time.Time `json:"next_attempt_at,omitempty"`
	// AttemptCount — число выполненных вызовов провайдера.
	AttemptCount int `json:"attempt_count"`
	// LeaseExpiresAt — срок аренды записи worker-ом.
	LeaseExpiresAt *time.Time `json:"lease_expires_at,omitempty"`
	// ProviderCallStartedAt фиксирует начало вызова провайдера: после него
	// гарантированная отмена невозможна.
	ProviderCallStartedAt *time.Time           `json:"provider_call_started_at,omitempty"`
	Payload               *NotificationPayload `json:"payload,omitempty"`
	LastError             *string              `json:"last_error,omitempty"`
	SentAt                *time.Time           `json:"sent_at,omitempty"`
	CreatedAt             time.Time            `json:"created_at"`
	UpdatedAt             time.Time            `json:"updated_at"`
}

// Terminal сообщает, что запись достигла конечного состояния.
func (n *Notification) Terminal() bool {
	switch n.Status {
	case NotificationSent, NotificationFailed, NotificationCancelled, NotificationUndeliverable:
		return true
	}
	return false
}

// ChannelFailed сообщает, что канал уже закрыт постоянной ошибкой.
func (n *Notification) ChannelFailed(ch Channel) bool {
	for _, c := range n.FailedChannels {
		if c == ch {
			return true
		}
	}
	return false
}

// AuditLog — запись журнала административных изменений (раздел 13 ТЗ).
type AuditLog struct {
	ID          uuid.UUID   `json:"id"`
	ActorUserID *uuid.UUID  `json:"actor_user_id,omitempty"`
	Action      AuditAction `json:"action"`
	EntityType  EntityType  `json:"entity_type"`
	EntityID    *uuid.UUID  `json:"entity_id,omitempty"`
	BeforeJSON  any         `json:"before,omitempty"`
	AfterJSON   any         `json:"after,omitempty"`
	RequestID   *string     `json:"request_id,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

// ReconcileCandidate — строка, отобранная планировщиком для согласования
// уведомлений: опубликованный неархивный хакатон, активная регистрация,
// назначенный участник, статус TODO и активный получатель.
type ReconcileCandidate struct {
	HackathonID       uuid.UUID
	HackathonTitle    string
	HackathonEndAt    time.Time
	RegistrationID    uuid.UUID
	RegistrationURL   string
	DeadlineAt        time.Time
	ScheduleVersion   int
	ActivationVersion int
	ContentVersion    int
	ParticipantID     uuid.UUID
	AssignmentVersion int
	StatusID          uuid.UUID
	TodoCycle         int
	RecipientID       uuid.UUID
	RecipientChannels RecipientChannels
}

// RecipientChannels — доступность каналов доставки получателя на момент отбора.
type RecipientChannels struct {
	TelegramLinked   bool
	EmailVerified    bool
	PreferredChannel *Channel
}

// Available сообщает, доступен ли канал получателю.
func (c RecipientChannels) Available(ch Channel) bool {
	switch ch {
	case ChannelTelegram:
		return c.TelegramLinked
	case ChannelEmail:
		return c.EmailVerified
	}
	return false
}

// OutboundMessage — сообщение, передаваемое адаптеру канала доставки.
type OutboundMessage struct {
	// IdempotencyKey — идентификатор уведомления; передаётся провайдеру,
	// если тот поддерживает ключ идемпотентности.
	IdempotencyKey string
	// Recipient — адрес назначения: email либо идентификатор чата Telegram.
	Recipient string
	Subject   string
	Body      string
}

// DeliveryError — ошибка адаптера доставки. Постоянная ошибка закрывает канал
// для этого уведомления, временная приводит к повтору с задержкой.
type DeliveryError struct {
	Permanent bool
	Reason    string
	Err       error
}

// Error реализует интерфейс error.
func (e *DeliveryError) Error() string {
	if e.Err != nil {
		return e.Reason + ": " + e.Err.Error()
	}
	return e.Reason
}

// Unwrap возвращает исходную ошибку.
func (e *DeliveryError) Unwrap() error { return e.Err }

// NewPermanentDeliveryError создаёт постоянную ошибку доставки.
func NewPermanentDeliveryError(reason string, err error) *DeliveryError {
	return &DeliveryError{Permanent: true, Reason: reason, Err: err}
}

// NewTemporaryDeliveryError создаёт временную ошибку доставки.
func NewTemporaryDeliveryError(reason string, err error) *DeliveryError {
	return &DeliveryError{Permanent: false, Reason: reason, Err: err}
}
