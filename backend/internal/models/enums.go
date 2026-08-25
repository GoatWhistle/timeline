// Package models содержит все структуры данных приложения: сущности, перечисления
// и DTO запросов/ответов HTTP API. Слой намеренно плоский — DDD не применяется.
package models

// Channel — канал доставки уведомления.
type Channel string

const (
	ChannelTelegram Channel = "TELEGRAM"
	ChannelEmail    Channel = "EMAIL"
)

// Valid сообщает, что значение канала допустимо.
func (c Channel) Valid() bool {
	return c == ChannelTelegram || c == ChannelEmail
}

// TokenPurpose — назначение одноразового токена.
type TokenPurpose string

const (
	TokenEmailVerification TokenPurpose = "EMAIL_VERIFICATION"
	TokenPasswordReset     TokenPurpose = "PASSWORD_RESET"
	TokenEmailChange       TokenPurpose = "EMAIL_CHANGE"
	TokenTelegramLink      TokenPurpose = "TELEGRAM_LINK"
)

// HackathonState — вычисляемое состояние хакатона.
type HackathonState string

const (
	HackathonUnpublished HackathonState = "UNPUBLISHED"
	HackathonUpcoming    HackathonState = "UPCOMING"
	HackathonActive      HackathonState = "ACTIVE"
	HackathonFinished    HackathonState = "FINISHED"
	HackathonArchived    HackathonState = "ARCHIVED"
)

// StageType — тип этапа хакатона.
type StageType string

const (
	StageRegistration  StageType = "REGISTRATION"
	StageSelection     StageType = "SELECTION"
	StageParticipation StageType = "PARTICIPATION"
	StageCheckpoint    StageType = "CHECKPOINT"
	StageSubmission    StageType = "SUBMISSION"
	StageDemo          StageType = "DEMO"
	StageResults       StageType = "RESULTS"
	StageOther         StageType = "OTHER"
)

// Valid сообщает, что тип этапа допустим.
func (s StageType) Valid() bool {
	switch s {
	case StageRegistration, StageSelection, StageParticipation, StageCheckpoint,
		StageSubmission, StageDemo, StageResults, StageOther:
		return true
	}
	return false
}

// ParticipationStatus — состояние участия в хакатоне.
type ParticipationStatus string

const (
	ParticipationAssigned ParticipationStatus = "ASSIGNED"
	ParticipationRemoved  ParticipationStatus = "REMOVED"
)

// RegistrationState — состояние регистрации хакатона.
type RegistrationState string

const (
	RegistrationActive   RegistrationState = "ACTIVE"
	RegistrationDisabled RegistrationState = "DISABLED"
)

// RegistrationStatusValue — заявленный статус внешней регистрации участника.
type RegistrationStatusValue string

const (
	StatusTODO        RegistrationStatusValue = "TODO"
	StatusDONE        RegistrationStatusValue = "DONE"
	StatusNotRequired RegistrationStatusValue = "NOT_REQUIRED"
)

// Valid сообщает, что значение статуса допустимо.
func (s RegistrationStatusValue) Valid() bool {
	return s == StatusTODO || s == StatusDONE || s == StatusNotRequired
}

// ChangeSource — источник последнего изменения статуса.
type ChangeSource string

const (
	SourceSystem ChangeSource = "SYSTEM"
	SourceUser   ChangeSource = "USER"
	SourceAdmin  ChangeSource = "ADMIN"
)

// NotificationType — тип уведомления.
type NotificationType string

const (
	NotificationRequired NotificationType = "REGISTRATION_REQUIRED"
	NotificationReminder NotificationType = "REGISTRATION_REMINDER"
	NotificationOverdue  NotificationType = "REGISTRATION_OVERDUE"
)

// NotificationStatus — состояние записи очереди уведомлений.
type NotificationStatus string

const (
	NotificationPending       NotificationStatus = "PENDING"
	NotificationProcessing    NotificationStatus = "PROCESSING"
	NotificationSent          NotificationStatus = "SENT"
	NotificationFailed        NotificationStatus = "FAILED"
	NotificationCancelled     NotificationStatus = "CANCELLED"
	NotificationUndeliverable NotificationStatus = "UNDELIVERABLE"
)

// AuditAction — именованное событие журнала аудита.
type AuditAction string

const (
	AuditUserRegister        AuditAction = "USER_REGISTER"
	AuditUserDeactivate      AuditAction = "USER_DEACTIVATE"
	AuditUserActivate        AuditAction = "USER_ACTIVATE"
	AuditUserDelete          AuditAction = "USER_DELETE"
	AuditUserProfileChange   AuditAction = "USER_PROFILE_CHANGE"
	AuditUserAdminFlagChange AuditAction = "USER_ADMIN_FLAG_CHANGE"
	AuditInviteCreate        AuditAction = "INVITE_CREATE"
	AuditInviteRevoke        AuditAction = "INVITE_REVOKE"
	AuditInviteAccept        AuditAction = "INVITE_ACCEPT"
	AuditHackathonCreate     AuditAction = "HACKATHON_CREATE"
	AuditHackathonUpdate     AuditAction = "HACKATHON_UPDATE"
	AuditHackathonPublish    AuditAction = "HACKATHON_PUBLISH"
	AuditHackathonArchive    AuditAction = "HACKATHON_ARCHIVE"
	AuditStageCreate         AuditAction = "STAGE_CREATE"
	AuditStageUpdate         AuditAction = "STAGE_UPDATE"
	AuditStageDelete         AuditAction = "STAGE_DELETE"
	AuditParticipantAdd      AuditAction = "PARTICIPANT_ADD"
	AuditParticipantRemove   AuditAction = "PARTICIPANT_REMOVE"
	AuditParticipantReactive AuditAction = "PARTICIPANT_REACTIVATE"
	AuditTeamRoleChange      AuditAction = "TEAM_ROLE_CHANGE"
	AuditRegistrationChange  AuditAction = "REGISTRATION_CHANGE"
	AuditStatusChange        AuditAction = "STATUS_CHANGE"
	AuditRuleChange          AuditAction = "RULE_CHANGE"
)

// EntityType — тип объекта, к которому относится запись аудита.
type EntityType string

const (
	EntityUser               EntityType = "USER"
	EntityInvite             EntityType = "INVITE"
	EntityHackathon          EntityType = "HACKATHON"
	EntityStage              EntityType = "STAGE"
	EntityParticipant        EntityType = "HACKATHON_PARTICIPANT"
	EntityRegistration       EntityType = "REGISTRATION"
	EntityRegistrationStatus EntityType = "REGISTRATION_STATUS"
	EntityNotificationRule   EntityType = "NOTIFICATION_RULE"
)
