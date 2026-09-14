package models

import "time"

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
	NotificationRequired           NotificationType = "REGISTRATION_REQUIRED"
	NotificationOverdue            NotificationType = "REGISTRATION_OVERDUE"
	NotificationDeadlineReminder   NotificationType = "REMINDER_REGISTRATION_DEADLINE"
	NotificationEventStartReminder NotificationType = "REMINDER_EVENT_START"
	NotificationStageStartReminder NotificationType = "REMINDER_STAGE_START"
	NotificationEventEndReminder   NotificationType = "REMINDER_EVENT_END"
	NotificationWeeklyDigest       NotificationType = "WEEKLY_DIGEST"
	NotificationPersonalTaskDue    NotificationType = "PERSONAL_TASK_DUE"
	NotificationRetrospectiveDue   NotificationType = "PERSONAL_RETROSPECTIVE_DUE"
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
	NotificationOverdue,
	NotificationDeadlineReminder,
	NotificationEventStartReminder,
	NotificationStageStartReminder,
	NotificationEventEndReminder,
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

var ReminderDayChoices = []int{1, 2, 3, 7, 14}

var ReminderOccasions = []NotificationOccasion{
	NotificationDeadlineReminder,
	NotificationEventStartReminder,
	NotificationStageStartReminder,
	NotificationEventEndReminder,
}

func ValidReminderDay(days int) bool {
	for _, choice := range ReminderDayChoices {
		if choice == days {
			return true
		}
	}
	return false
}

func ValidReminderOccasion(occasion NotificationOccasion) bool {
	for _, known := range ReminderOccasions {
		if known == occasion {
			return true
		}
	}
	return false
}

type ReminderSchedule struct {
	Days           map[NotificationOccasion][]int
	OverdueEnabled bool
	Version        int
}

func NewReminderSchedule() *ReminderSchedule {
	return &ReminderSchedule{Days: make(map[NotificationOccasion][]int, len(ReminderOccasions))}
}

func DefaultReminderSchedule() *ReminderSchedule {
	s := NewReminderSchedule()
	s.Days[NotificationDeadlineReminder] = []int{1, 3}
	s.Days[NotificationEventStartReminder] = []int{1}
	s.Days[NotificationStageStartReminder] = []int{1}
	s.OverdueEnabled = true
	s.Version = 1
	return s
}

func (s *ReminderSchedule) DaysFor(occasion NotificationOccasion) []int {
	if s == nil {
		return nil
	}
	return s.Days[occasion]
}

func (s *ReminderSchedule) Empty() bool {
	if s == nil {
		return true
	}
	for _, occasion := range ReminderOccasions {
		if len(s.Days[occasion]) > 0 {
			return false
		}
	}
	return !s.OverdueEnabled
}

func NormalizeReminderDays(values []int) []int {
	out := make([]int, 0, len(ReminderDayChoices))
	for _, choice := range ReminderDayChoices {
		for _, v := range values {
			if v == choice {
				out = append(out, choice)
				break
			}
		}
	}
	return out
}

func ReminderTriggerAt(moment time.Time, daysBefore int) time.Time {
	return moment.AddDate(0, 0, -daysBefore)
}
