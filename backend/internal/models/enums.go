package models

type Channel string

const (
	ChannelTelegram Channel = "TELEGRAM"
	ChannelEmail    Channel = "EMAIL"
)

func (c Channel) Valid() bool {
	return c == ChannelTelegram || c == ChannelEmail
}

type TokenPurpose string

const (
	PurposeEmailVerification TokenPurpose = "EMAIL_VERIFICATION"
	PurposePasswordReset     TokenPurpose = "PASSWORD_RESET"
	PurposeEmailChange       TokenPurpose = "EMAIL_CHANGE"
	PurposeTelegramLink      TokenPurpose = "TELEGRAM_LINK"
)

type EventState string

const (
	EventUnpublished EventState = "UNPUBLISHED"
	EventUpcoming    EventState = "UPCOMING"
	EventActive      EventState = "ACTIVE"
	EventFinished    EventState = "FINISHED"
	EventArchived    EventState = "ARCHIVED"
)

type EventKind string

const (
	EventKindHackathon EventKind = "HACKATHON"
	EventKindMeetup    EventKind = "MEETUP"
)

func (k EventKind) Valid() bool {
	return k == EventKindHackathon || k == EventKindMeetup
}

type EventFormat string

const (
	FormatOnline  EventFormat = "ONLINE"
	FormatOffline EventFormat = "OFFLINE"
	FormatHybrid  EventFormat = "HYBRID"
)

func (f EventFormat) Valid() bool {
	return f == FormatOnline || f == FormatOffline || f == FormatHybrid
}

func (f EventFormat) RequiresPlace() bool {
	return f == FormatOffline || f == FormatHybrid
}

type EventOrigin string

const (
	OriginRU    EventOrigin = "RU"
	OriginWorld EventOrigin = "WORLD"
)

func (o EventOrigin) Valid() bool {
	return o == OriginRU || o == OriginWorld
}

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

func (s StageType) Valid() bool {
	switch s {
	case StageRegistration, StageSelection, StageParticipation, StageCheckpoint,
		StageSubmission, StageDemo, StageResults, StageOther:
		return true
	}
	return false
}

type ParticipationStatus string

const (
	ParticipationAssigned ParticipationStatus = "ASSIGNED"
	ParticipationRemoved  ParticipationStatus = "REMOVED"
)

type RegistrationState string

const (
	RegistrationActive   RegistrationState = "ACTIVE"
	RegistrationDisabled RegistrationState = "DISABLED"
)

type RegistrationStatusValue string

const (
	StatusTODO        RegistrationStatusValue = "TODO"
	StatusDONE        RegistrationStatusValue = "DONE"
	StatusNotRequired RegistrationStatusValue = "NOT_REQUIRED"
)

func (s RegistrationStatusValue) Valid() bool {
	return s == StatusTODO || s == StatusDONE || s == StatusNotRequired
}

func (s RegistrationStatusValue) AdminCanMoveTo(next RegistrationStatusValue) bool {
	switch s {
	case StatusTODO:
		return next == StatusDONE || next == StatusNotRequired
	case StatusDONE:
		return next == StatusTODO || next == StatusNotRequired
	case StatusNotRequired:
		return next == StatusTODO
	}
	return false
}

type ChangeSource string

const (
	SourceSystem ChangeSource = "SYSTEM"
	SourceUser   ChangeSource = "USER"
	SourceAdmin  ChangeSource = "ADMIN"
)

type NotificationType string

const (
	NotificationRequired NotificationType = "REGISTRATION_REQUIRED"
	NotificationReminder NotificationType = "REGISTRATION_REMINDER"
	NotificationOverdue  NotificationType = "REGISTRATION_OVERDUE"
)

type NotificationStatus string

const (
	NotificationPending       NotificationStatus = "PENDING"
	NotificationProcessing    NotificationStatus = "PROCESSING"
	NotificationSent          NotificationStatus = "SENT"
	NotificationFailed        NotificationStatus = "FAILED"
	NotificationCancelled     NotificationStatus = "CANCELLED"
	NotificationUndeliverable NotificationStatus = "UNDELIVERABLE"
)

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
	AuditEventCreate         AuditAction = "EVENT_CREATE"
	AuditEventUpdate         AuditAction = "EVENT_UPDATE"
	AuditEventPublish        AuditAction = "EVENT_PUBLISH"
	AuditEventArchive        AuditAction = "EVENT_ARCHIVE"
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
	AuditLinkCreate          AuditAction = "RESOURCE_LINK_CREATE"
	AuditLinkUpdate          AuditAction = "RESOURCE_LINK_UPDATE"
	AuditLinkDelete          AuditAction = "RESOURCE_LINK_DELETE"
	AuditCalendarFeedIssue   AuditAction = "CALENDAR_FEED_ISSUE"
	AuditCalendarFeedRevoke  AuditAction = "CALENDAR_FEED_REVOKE"
)

type EntityType string

const (
	EntityUser               EntityType = "USER"
	EntityInvite             EntityType = "INVITE"
	EntityEvent              EntityType = "EVENT"
	EntityStage              EntityType = "STAGE"
	EntityParticipant        EntityType = "EVENT_PARTICIPANT"
	EntityRegistration       EntityType = "REGISTRATION"
	EntityRegistrationStatus EntityType = "REGISTRATION_STATUS"
	EntityNotificationRule   EntityType = "NOTIFICATION_RULE"
	EntityResourceLink       EntityType = "RESOURCE_LINK"
	EntityCalendarFeed       EntityType = "CALENDAR_FEED"
)
