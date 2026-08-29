package config

import "time"

type Realtime struct {
	Enabled           bool
	PingInterval      time.Duration
	MaxPerUser        int
	QueueAgeThreshold time.Duration
}

func loadRealtime() Realtime {
	return Realtime{
		Enabled:           envBool("REALTIME_ENABLED", true),
		PingInterval:      envDuration("REALTIME_PING_INTERVAL", 30*time.Second),
		MaxPerUser:        envInt("REALTIME_MAX_CONNECTIONS_PER_USER", 8),
		QueueAgeThreshold: envDuration("REALTIME_QUEUE_AGE_THRESHOLD", 30*time.Minute),
	}
}
