package controllers

import (
	"net/http"
	"strings"

	"github.com/GoatWhistle/timeline/internal/controllers/auth"
	"github.com/GoatWhistle/timeline/internal/controllers/event"
	"github.com/GoatWhistle/timeline/internal/controllers/finance"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/inbox"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/notification"
	"github.com/GoatWhistle/timeline/internal/controllers/participation"
	"github.com/GoatWhistle/timeline/internal/controllers/personal"
	"github.com/GoatWhistle/timeline/internal/controllers/team"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
)

// @title			Timeline API
// @version		0.8.0
// @description	Timeline REST API. Implements technical specification v0.8:
// @description	accounts, events and stages, participant assignments,
// @description	registration with self-reported status, reminder rules and the audit log.
// @description
// @description	The system does not verify the external registration site: the status is self-reported
// @description	by the user or set administratively.
// @description
// @description				Authentication is cookie-based: the access token lives 15 minutes, the refresh token
// @description				rotates and lives 30 days. Every mutating request must send
// @description				a CSRF token in the X-CSRF-Token header; obtain one from GET /auth/csrf.
// @description				All timestamps are transferred in UTC using RFC 3339.
// @termsOfService				https://github.com/GoatWhistle/timeline
// @contact.name				Timeline team
// @license.name				MIT
// @host						localhost:8080
// @BasePath					/api/v1
// @schemes					http https
// @securityDefinitions.apikey	CookieAuth
// @in							cookie
// @name						access_token
// @description				Access token in an HttpOnly cookie, issued on sign-in and session refresh.
// @tag.name					auth
// @tag.description			Registration, sign-in, sessions and account recovery
// @tag.name					profile
// @tag.description			Own profile and delivery channels
// @tag.name					users
// @tag.description			Administrative operations on accounts
// @tag.name					catalog
// @tag.description			Event catalog and self-signup
// @tag.name					events
// @tag.description			Events and their lifecycle
// @tag.name					stages
// @tag.description			Event stages
// @tag.name					tracks
// @tag.description			Hackathon tracks and the prize split across their places
// @tag.name					finance
// @tag.description			Event money in one place: pool, track prizes, partner cases and their reconciliation
// @tag.name					participants
// @tag.description			Participant roster and bulk operations
// @tag.name					registration
// @tag.description			Event registration and participant statuses
// @tag.name					rules
// @tag.description			Reminder rules
// @tag.name					queries
// @tag.description			Read models: my events, the card, the schedule and deadlines
// @tag.name					audit
// @tag.description			Log of administrative changes
// @tag.name					personal
// @tag.description			The participant's own layer: tasks, notes, artifacts and outcome
// @tag.name					events-feed
// @tag.description			The system event bus: an in-app mirror of what happened, not a delivery channel
// @tag.name					realtime
// @tag.description			The WebSocket channel that tells a client what went stale
// @tag.name					teams
// @tag.description			Teams: a lead, their members and the hackathons a team entered
// @tag.name					retention
// @tag.description			Storage retention: automatic archiving, scheduled deletion and the audit log window
// @tag.name					ops
// @tag.description			Service probes and metrics
// @tag.name					telegram
// @tag.description			Telegram account linking
// @tag.name					inbox
// @tag.description			The notification center: readable, deletable copies of what was sent
func NewRouter(deps Deps) http.Handler {
	authC := auth.NewController(deps.Auth, deps.Cookies, deps.CSRFTTL)
	profileC := auth.NewProfileController(deps.Profile, deps.Cookies, deps.Limiter,
		deps.ProfileRate, deps.ProfileRateWindow)
	telegramC := auth.NewTelegramWebhookController(deps.Profile, deps.TelegramWebhookSecret).
		WithBot(deps.TelegramBot)
	publicProfileC := auth.NewPublicProfileController(deps.PublicProfiles, deps.Limiter,
		deps.PublicRate, deps.PublicRateWindow)
	userC := auth.NewUserController(deps.Users, deps.UserPageSize, deps.PageMax)
	eventC := event.NewController(deps.Events, deps.Stages, deps.Tracks, deps.PageDefault, deps.PageMax)
	catalogC := event.NewCatalogController(deps.Catalog, deps.Limiter, deps.CatalogRate,
		deps.CatalogRateWindow, deps.PageDefault, deps.PageMax)
	sessionC := auth.NewSessionController(deps.Auth, deps.Cookies, deps.Limiter,
		deps.SessionRate, deps.SessionRateWindow)
	profileLinkC := auth.NewProfileLinkController(deps.ProfileLinks, deps.Limiter,
		deps.ProfileRate, deps.ProfileRateWindow)
	avatarC := auth.NewAvatarController(deps.Avatars, deps.Limiter,
		deps.ProfileRate, deps.ProfileRateWindow, deps.AvatarMaxBytes)
	coverC := event.NewCoverController(deps.Covers, deps.CoverMaxBytes)
	partC, regC, statusC := participationControllers(deps)
	queryC := event.NewQueryController(deps.Queries, deps.PageDefault, deps.PageMax)
	auditC, opsC, previewC := notificationControllers(deps)
	personalC := personal.NewController(deps.Personal, deps.Limiter, deps.PersonalRate,
		deps.PersonalRateWindow, deps.PageDefault, deps.PageMax)
	linkC := event.NewResourceLinkController(deps.Links, deps.Limiter, deps.LinkRate,
		deps.LinkRateWindow)
	retentionC := event.NewRetentionController(deps.Retention, deps.Events)
	teamC := team.NewController(deps.Teams)
	inboxC := inbox.NewController(deps.Inbox, deps.PageDefault, deps.PageMax)

	rt := &routes{authn: deps.Authenticator}
	mux := http.NewServeMux()
	const api = "/api/v1"

	mountAuth(mux, rt, api, authC)
	mux.Handle("POST "+api+"/telegram/webhook", http.HandlerFunc(telegramC.Handle))
	mountPublicProfile(mux, rt, api, publicProfileC)
	mountMe(mux, rt, api, profileC, sessionC, queryC, catalogC, eventC, statusC, profileLinkC, avatarC, inboxC)
	mountCovers(mux, rt, api, coverC)
	mountFinance(mux, rt, api, finance.NewController(deps.Finance, deps.Cases))
	mountPersonal(mux, rt, api, personalC)
	mountTeams(mux, rt, api, teamC)
	mountResourceLinks(mux, rt, api, linkC)
	mountRealtime(mux, rt, api, deps)
	mountAdminIdentity(mux, rt, api, userC, eventC)
	mountRetention(mux, rt, api, retentionC)
	mountAdminRegistration(mux, rt, api, partC, regC, statusC, previewC)
	mountAdminQueries(mux, rt, api, queryC, auditC, opsC)
	mountServiceRoutes(mux, api, deps.SwaggerUI)

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.Recover,
		middleware.Logging,
		middleware.CORS(deps.CORSOrigins),
		middleware.CSRF,
	)
}

func mountServiceRoutes(mux *http.ServeMux, api string, ui http.Handler) {
	mountMailAssets(mux)
	mountSwagger(mux, ui)
	mountUnknownAPIPath(mux, api)
}

func mountMailAssets(mux *http.ServeMux) {
	mux.Handle("GET /mail/logo-light.png", mail.LogoHandler("light"))
	mux.Handle("GET /mail/logo-dark.png", mail.LogoHandler("dark"))
}

func mountUnknownAPIPath(mux *http.ServeMux, api string) {
	mux.Handle(api+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if wantsHTML(r) {
			http.Redirect(w, r, "/404", http.StatusSeeOther)
			return
		}
		httpx.Error(w, r, models.NewNotFound("no such endpoint"))
	}))
}

func wantsHTML(r *http.Request) bool {
	if r.Method != http.MethodGet {
		return false
	}
	for _, accepted := range strings.Split(r.Header.Get("Accept"), ",") {
		media := strings.TrimSpace(strings.SplitN(accepted, ";", 2)[0])
		if media == "text/html" {
			return true
		}
		if media == "application/json" {
			return false
		}
	}
	return false
}

func mountSwagger(mux *http.ServeMux, ui http.Handler) {
	if ui == nil {
		return
	}
	mux.Handle("GET /docs/", ui)
	mux.Handle("GET /docs", http.RedirectHandler("/docs/index.html", http.StatusMovedPermanently))
}

type routes struct {
	authn middleware.Authenticator
}

func (rt *routes) authd(fn http.HandlerFunc) http.Handler {
	return middleware.Auth(rt.authn)(fn)
}

func (rt *routes) admin(fn http.HandlerFunc) http.Handler {
	return middleware.Auth(rt.authn)(middleware.AdminOnly(fn))
}

func (rt *routes) optional(fn http.HandlerFunc) http.Handler {
	return middleware.OptionalAuth(rt.authn)(fn)
}

func participationControllers(deps Deps) (*participation.Controller,
	*participation.RegistrationController, *participation.RegistrationStatusController) {
	return participation.NewController(deps.Participants, deps.PageDefault, deps.PageMax),
		participation.NewRegistrationController(deps.Registrations, deps.PageDefault, deps.PageMax),
		participation.NewRegistrationStatusController(deps.Statuses, deps.PageDefault, deps.PageMax)
}

func notificationControllers(deps Deps) (*notification.AuditController,
	*notification.OpsController, *notification.PreviewController) {
	return notification.NewAuditController(deps.Audit, deps.PageDefault, deps.PageMax),
		notification.NewOpsController(deps.Ops, deps.MetricsToken, deps.Metrics),
		notification.NewPreviewController(deps.Previews, deps.Limiter,
			deps.PreviewRate, deps.PreviewRateWindow)
}
