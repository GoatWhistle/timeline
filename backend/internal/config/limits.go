package config

import (
	"fmt"
	"time"
)

type Personal struct {
	MaxTasksPerEvent     int
	MaxArtifactsPerEvent int
	MaxNoteLength        int
	TaskReminderLead     time.Duration
	TaskReminderGrace    time.Duration
	RetrospectiveDelay   time.Duration
	RetrospectiveGrace   time.Duration
	ReminderBatch        int
}

type Digest struct {
	Interval time.Duration
	Batch    int
	MaxItems int
}

type ResourceLinks struct {
	MaxPerEvent         int
	MaxPersonalPerEvent int
}

type Avatar struct {
	Root         string
	MaxBytes     int64
	MaxDimension int
}

func loadPersonal() Personal {
	return Personal{
		MaxTasksPerEvent:     envInt("PERSONAL_MAX_TASKS_PER_EVENT", 200),
		MaxArtifactsPerEvent: envInt("PERSONAL_MAX_ARTIFACTS_PER_EVENT", 20),
		MaxNoteLength:        envInt("PERSONAL_MAX_NOTE_LENGTH", 20000),
		TaskReminderLead:     envDuration("PERSONAL_TASK_REMINDER_LEAD", time.Hour),
		TaskReminderGrace:    envDuration("PERSONAL_TASK_REMINDER_GRACE", 7*24*time.Hour),
		RetrospectiveDelay:   envDuration("PERSONAL_RETROSPECTIVE_DELAY", 48*time.Hour),
		RetrospectiveGrace:   envDuration("PERSONAL_RETROSPECTIVE_GRACE", 14*24*time.Hour),
		ReminderBatch:        envInt("PERSONAL_REMINDER_BATCH", 200),
	}
}

func loadDigest() Digest {
	return Digest{
		Interval: envDuration("DIGEST_INTERVAL", time.Hour),
		Batch:    envInt("DIGEST_BATCH", 200),
		MaxItems: envInt("DIGEST_MAX_ITEMS", 50),
	}
}

func (a Avatar) validate() error {
	if a.MaxBytes < 1 {
		return fmt.Errorf("AVATAR_MAX_BYTES must be at least 1")
	}
	if a.MaxDimension < 1 {
		return fmt.Errorf("AVATAR_MAX_DIMENSION must be at least 1")
	}
	return nil
}

func loadAvatar() Avatar {
	return Avatar{
		Root:         env("AVATAR_STORAGE_ROOT", "/var/lib/timeline/avatars"),
		MaxBytes:     int64(envInt("AVATAR_MAX_BYTES", 2*1024*1024)),
		MaxDimension: envInt("AVATAR_MAX_DIMENSION", 4096),
	}
}

func loadResourceLinks() ResourceLinks {
	return ResourceLinks{
		MaxPerEvent:         envInt("RESOURCE_LINKS_MAX_PER_EVENT", 50),
		MaxPersonalPerEvent: envInt("RESOURCE_LINKS_MAX_PERSONAL_PER_EVENT", 20),
	}
}
