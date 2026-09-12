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
	MaxPerEvent int
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
		MaxBytes:     int64(envInt("AVATAR_MAX_BYTES", 5*1024*1024)),
		MaxDimension: envInt("AVATAR_MAX_DIMENSION", 4096),
	}
}

func loadResourceLinks() ResourceLinks {
	return ResourceLinks{
		MaxPerEvent: envInt("RESOURCE_LINKS_MAX_PER_EVENT", 50),
	}
}

type Cover struct {
	Root         string
	MaxBytes     int64
	MaxDimension int
	FetchEnabled bool
	FetchTimeout time.Duration
	FetchMaxRe   int
	FetchMaxByte int64
	UserAgent    string
}

func (c Cover) validate() error {
	if c.MaxBytes < 1 {
		return fmt.Errorf("COVER_MAX_BYTES must be at least 1")
	}
	if c.MaxDimension < 1 {
		return fmt.Errorf("COVER_MAX_DIMENSION must be at least 1")
	}
	if c.FetchTimeout < time.Second {
		return fmt.Errorf("COVER_FETCH_TIMEOUT must be at least 1s")
	}
	if c.FetchMaxRe < 0 {
		return fmt.Errorf("COVER_FETCH_MAX_REDIRECTS cannot be negative")
	}
	if c.FetchMaxByte < 1 {
		return fmt.Errorf("COVER_FETCH_MAX_BYTES must be at least 1")
	}
	return nil
}

func loadCover() Cover {
	return Cover{
		Root:         env("COVER_STORAGE_ROOT", "/var/lib/timeline/covers"),
		MaxBytes:     int64(envInt("COVER_MAX_BYTES", 5*1024*1024)),
		MaxDimension: envInt("COVER_MAX_DIMENSION", 6000),
		FetchEnabled: envBool("COVER_FETCH_ENABLED", true),
		FetchTimeout: envDuration("COVER_FETCH_TIMEOUT", 10*time.Second),
		FetchMaxRe:   envInt("COVER_FETCH_MAX_REDIRECTS", 3),
		FetchMaxByte: int64(envInt("COVER_FETCH_MAX_BYTES", 5*1024*1024)),
		UserAgent:    env("COVER_FETCH_USER_AGENT", "TimelineCoverBot/1.0"),
	}
}
