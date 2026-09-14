package controllers

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/auth"
	"github.com/GoatWhistle/timeline/internal/controllers/event"
	"github.com/GoatWhistle/timeline/internal/controllers/finance"
	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/inbox"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/notification"
	"github.com/GoatWhistle/timeline/internal/controllers/participation"
	"github.com/GoatWhistle/timeline/internal/controllers/personal"
	"github.com/GoatWhistle/timeline/internal/controllers/realtime"
	"github.com/GoatWhistle/timeline/internal/controllers/team"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

type Deps struct {
	Auth          auth.AuthService
	Profile       auth.ProfileService
	Avatars       auth.AvatarService
	ProfileLinks  auth.ProfileLinkService
	Users         auth.UserService
	Events        event.EventService
	Covers        event.CoverService
	Catalog       event.CatalogService
	Stages        event.StageService
	Tracks        event.TrackService
	Finance       finance.FinanceService
	Cases         finance.CaseService
	Participants  participation.ParticipantService
	Registrations participation.RegistrationService
	Statuses      participation.StatusService
	Queries       event.QueryService
	Audit         notification.AuditService
	Ops           notification.OpsService
	Previews      notification.PreviewService
	Personal      personal.PersonalService
	Feed          realtime.SystemEventService
	Realtime      realtime.RealtimeHub
	Sessions      realtime.SessionChecker
	Links         event.ResourceLinkService
	Retention     event.RetentionService
	Teams         team.TeamService
	Inbox         inbox.Service

	Authenticator         middleware.Authenticator
	Metrics               http.Handler
	SwaggerUI             http.Handler
	TelegramWebhookSecret string
	TelegramBot           *telegramlink.Bot

	Limiter            httpsession.Limiter
	CatalogRate        int
	CatalogRateWindow  time.Duration
	PublicProfiles     auth.PublicProfileService
	PublicRate         int
	PublicRateWindow   time.Duration
	SessionRate        int
	SessionRateWindow  time.Duration
	ProfileRate        int
	ProfileRateWindow  time.Duration
	PreviewRate        int
	PreviewRateWindow  time.Duration
	PersonalRate       int
	PersonalRateWindow time.Duration
	FeedRate           int
	FeedRateWindow     time.Duration
	RealtimeRate       int
	RealtimeRateWindow time.Duration
	RealtimePing       time.Duration
	LinkRate           int
	LinkRateWindow     time.Duration
	AvatarMaxBytes     int64
	CoverMaxBytes      int64

	Cookies      httpsession.CookieOptions
	PublicURL    string
	CORSOrigins  []string
	MetricsToken string
	PageDefault  int
	PageMax      int
	UserPageSize int
	CSRFTTL      time.Duration
}
