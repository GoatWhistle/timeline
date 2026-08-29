package controllers

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

type Deps struct {
	Auth          AuthService
	Invites       InviteService
	Profile       ProfileService
	Users         UserService
	Events        EventService
	Catalog       CatalogService
	Stages        StageService
	Participants  ParticipantService
	Registrations RegistrationService
	Statuses      StatusService
	Rules         RuleService
	Queries       QueryService
	Audit         AuditService
	Ops           OpsService
	Previews      PreviewService
	Personal      PersonalService
	Feed          SystemEventService
	Notifications NotificationHistoryService
	Realtime      RealtimeHub
	Sessions      SessionChecker
	Links         ResourceLinkService
	CalendarFeeds CalendarFeedService

	Authenticator middleware.Authenticator
	Metrics       http.Handler
	SwaggerUI     http.Handler

	Limiter            Limiter
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

	Cookies      CookieOptions
	PublicURL    string
	CORSOrigins  []string
	MetricsToken string
	PageDefault  int
	PageMax      int
	UserPageSize int
	CSRFTTL      time.Duration
}
