package models

type ChannelSet []Channel

var AllChannels = []Channel{ChannelTelegram, ChannelEmail}

func (s ChannelSet) Has(ch Channel) bool {
	for _, c := range s {
		if c == ch {
			return true
		}
	}
	return false
}

func (s ChannelSet) Empty() bool { return len(s) == 0 }

func NormalizeChannelSet(values []Channel) ChannelSet {
	out := make(ChannelSet, 0, len(AllChannels))
	for _, ch := range AllChannels {
		for _, v := range values {
			if v == ch {
				out = append(out, ch)
				break
			}
		}
	}
	return out
}

type NotificationType string

const (
	NotificationRequired         NotificationType = "REGISTRATION_REQUIRED"
	NotificationReminder         NotificationType = "REGISTRATION_REMINDER"
	NotificationOverdue          NotificationType = "REGISTRATION_OVERDUE"
	NotificationWeeklyDigest     NotificationType = "WEEKLY_DIGEST"
	NotificationPersonalTaskDue  NotificationType = "PERSONAL_TASK_DUE"
	NotificationRetrospectiveDue NotificationType = "PERSONAL_RETROSPECTIVE_DUE"
)

func (t NotificationType) PersonalOccasion() bool {
	switch t {
	case NotificationWeeklyDigest, NotificationPersonalTaskDue, NotificationRetrospectiveDue:
		return true
	}
	return false
}

type NotificationOccasion = NotificationType

var AllOccasions = []NotificationOccasion{
	NotificationRequired,
	NotificationReminder,
	NotificationOverdue,
	NotificationWeeklyDigest,
	NotificationPersonalTaskDue,
	NotificationRetrospectiveDue,
}

func ValidOccasion(value NotificationOccasion) bool {
	for _, occasion := range AllOccasions {
		if occasion == value {
			return true
		}
	}
	return false
}

type NotificationPreference struct {
	Occasion NotificationOccasion `json:"occasion"`
	Channel  Channel              `json:"channel"`
	Enabled  bool                 `json:"enabled"`
}

type NotificationPreferences map[NotificationOccasion]ChannelSet

func (p NotificationPreferences) Allows(occasion NotificationOccasion, ch Channel) bool {
	muted, ok := p[occasion]
	if !ok {
		return true
	}
	return !muted.Has(ch)
}

func DefaultPreferences() []NotificationPreference {
	out := make([]NotificationPreference, 0, len(AllOccasions)*len(AllChannels))
	for _, occasion := range AllOccasions {
		for _, ch := range AllChannels {
			out = append(out, NotificationPreference{Occasion: occasion, Channel: ch, Enabled: true})
		}
	}
	return out
}
