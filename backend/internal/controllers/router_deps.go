package controllers

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/auth"
	"github.com/GoatWhistle/timeline/internal/controllers/event"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/notification"
	"github.com/GoatWhistle/timeline/internal/controllers/participation"
	"github.com/GoatWhistle/timeline/internal/controllers/personal"
	"github.com/GoatWhistle/timeline/internal/controllers/realtime"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
)

type Deps struct {
	Auth          auth.AuthService
	Invites       auth.InviteService
	Profile       auth.ProfileService
	Users         auth.UserService
	Events        event.EventService
	Catalog       event.CatalogService
	Stages        event.StageService
	Participants  participation.ParticipantService
	Registrations participation.RegistrationService
	Statuses      participation.StatusService
	Rules         notification.RuleService
	Queries       event.QueryService
	Audit         notification.AuditService
	Ops           notification.OpsService
	Previews      notification.PreviewService
	Personal      personal.PersonalService
	Feed          realtime.SystemEventService
	Notifications notification.NotificationHistoryService
	Realtime      realtime.RealtimeHub
	Sessions      realtime.SessionChecker
	Links         event.ResourceLinkService
	CalendarFeeds realtime.CalendarFeedService

	Authenticator middleware.Authenticator
	Metrics       http.Handler
	SwaggerUI     http.Handler

	Limiter            shared.Limiter
	CatalogRate        int
	CatalogRateWindow  time.Duration
	SessionRate        int
	SessionRateWindow  time.Duration
	ProfileRate        int
	ProfileRateWindow  time.Duration
	PreviewRate        int
	PreviewRateWindow  time.Duration
	QueueRate          int
	QueueRateWindow    time.Duration
	PersonalRate       int
	PersonalRateWindow time.Duration
	FeedRate           int
	FeedRateWindow     time.Duration
	CalendarRate       int
	CalendarRateWindow time.Duration
	ICSRate            int
	ICSRateWindow      time.Duration
	RealtimeRate       int
	RealtimeRateWindow time.Duration
	RealtimePing       time.Duration
	LinkRate           int
	LinkRateWindow     time.Duration

	Cookies      shared.CookieOptions
	PublicURL    string
	CORSOrigins  []string
	MetricsToken string
	PageDefault  int
	PageMax      int
	UserPageSize int
	CSRFTTL      time.Duration
}
