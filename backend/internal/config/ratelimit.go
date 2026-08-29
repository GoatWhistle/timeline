package config

import "time"

type RateLim struct {
	LoginAttempts    int
	LoginWindow      time.Duration
	ResendAttempts   int
	ResendWindow     time.Duration
	CatalogRequests  int
	CatalogWindow    time.Duration
	SessionRequests  int
	SessionWindow    time.Duration
	PreviewRequests  int
	PreviewWindow    time.Duration
	QueueRequests    int
	QueueWindow      time.Duration
	PersonalRequests int
	PersonalWindow   time.Duration
	FeedRequests     int
	FeedWindow       time.Duration
	RealtimeAttempts int
	RealtimeWindow   time.Duration
	LinkRequests     int
	LinkWindow       time.Duration
	CalendarRequests int
	CalendarWindow   time.Duration
	ICSRequests      int
	ICSWindow        time.Duration
	ProfileRequests  int
	ProfileWindow    time.Duration
	PublicRequests   int
	PublicWindow     time.Duration
}

func loadRateLim() RateLim {
	return RateLim{
		LoginAttempts:    envInt("RATE_LIMIT_LOGIN_ATTEMPTS", 10),
		LoginWindow:      envDuration("RATE_LIMIT_LOGIN_WINDOW", 15*time.Minute),
		ResendAttempts:   envInt("RATE_LIMIT_RESEND_ATTEMPTS", 5),
		ResendWindow:     envDuration("RATE_LIMIT_RESEND_WINDOW", time.Hour),
		CatalogRequests:  envInt("RATE_LIMIT_CATALOG_REQUESTS", 120),
		CatalogWindow:    envDuration("RATE_LIMIT_CATALOG_WINDOW", time.Minute),
		SessionRequests:  envInt("RATE_LIMIT_SESSION_REQUESTS", 60),
		SessionWindow:    envDuration("RATE_LIMIT_SESSION_WINDOW", time.Minute),
		PreviewRequests:  envInt("RATE_LIMIT_PREVIEW_REQUESTS", 60),
		PreviewWindow:    envDuration("RATE_LIMIT_PREVIEW_WINDOW", time.Minute),
		QueueRequests:    envInt("RATE_LIMIT_QUEUE_REQUESTS", 60),
		QueueWindow:      envDuration("RATE_LIMIT_QUEUE_WINDOW", time.Minute),
		PersonalRequests: envInt("RATE_LIMIT_PERSONAL_REQUESTS", 240),
		PersonalWindow:   envDuration("RATE_LIMIT_PERSONAL_WINDOW", time.Minute),
		FeedRequests:     envInt("RATE_LIMIT_FEED_REQUESTS", 240),
		FeedWindow:       envDuration("RATE_LIMIT_FEED_WINDOW", time.Minute),
		RealtimeAttempts: envInt("RATE_LIMIT_REALTIME_ATTEMPTS", 30),
		RealtimeWindow:   envDuration("RATE_LIMIT_REALTIME_WINDOW", time.Minute),
		LinkRequests:     envInt("RATE_LIMIT_LINK_REQUESTS", 240),
		LinkWindow:       envDuration("RATE_LIMIT_LINK_WINDOW", time.Minute),
		ProfileRequests:  envInt("RATE_LIMIT_PROFILE_REQUESTS", 30),
		ProfileWindow:    envDuration("RATE_LIMIT_PROFILE_WINDOW", time.Minute),
		CalendarRequests: envInt("RATE_LIMIT_CALENDAR_REQUESTS", 60),
		CalendarWindow:   envDuration("RATE_LIMIT_CALENDAR_WINDOW", time.Minute),
		ICSRequests:      envInt("RATE_LIMIT_ICS_REQUESTS", 60),
		ICSWindow:        envDuration("RATE_LIMIT_ICS_WINDOW", time.Minute),
		PublicRequests:   envInt("RATE_LIMIT_PUBLIC_PROFILE_REQUESTS", 60),
		PublicWindow:     envDuration("RATE_LIMIT_PUBLIC_PROFILE_WINDOW", time.Minute),
	}
}
