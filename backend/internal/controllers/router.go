package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

// @title			Timeline API
// @version		0.8.0
// @description	Timeline REST API. Implements technical specification v0.8:
// @description	accounts and invites, events and stages, participant assignments,
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
// @tag.name					invites
// @tag.description			Registration invites
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
// @tag.description			The participant's own layer: tasks, notes, artifacts, outcome and bookmarks
// @tag.name					events-feed
// @tag.description			The system event bus: an in-app mirror of what happened, not a delivery channel
// @tag.name					realtime
// @tag.description			The WebSocket channel that tells a client what went stale
// @tag.name					ops
// @tag.description			Service probes and metrics
func NewRouter(deps Deps) http.Handler {
	authC := NewAuthController(deps.Auth, deps.Cookies, deps.CSRFTTL)
	inviteC := NewInviteController(deps.Invites, deps.Cookies, deps.PublicURL, deps.CSRFTTL, deps.PageDefault, deps.PageMax)
	profileC := NewProfileController(deps.Profile, deps.Cookies)
	userC := NewUserController(deps.Users, deps.UserPageSize, deps.PageMax)
	eventC := NewEventController(deps.Events, deps.Stages, deps.PageDefault, deps.PageMax)
	catalogC := NewCatalogController(deps.Catalog, deps.Limiter, deps.CatalogRate,
		deps.CatalogRateWindow, deps.PageDefault, deps.PageMax)
	sessionC := NewSessionController(deps.Auth, deps.Cookies, deps.Limiter,
		deps.SessionRate, deps.SessionRateWindow)
	partC := NewParticipantController(deps.Participants, deps.PageDefault, deps.PageMax)
	regC := NewRegistrationController(deps.Registrations, deps.Statuses, deps.Rules, deps.PageDefault, deps.PageMax)
	queryC := NewQueryController(deps.Queries, deps.PageDefault, deps.PageMax)
	auditC := NewAuditController(deps.Audit, deps.PageDefault, deps.PageMax)
	opsC := NewOpsController(deps.Ops, deps.MetricsToken, deps.Metrics, deps.Limiter,
		deps.QueueRate, deps.QueueRateWindow, deps.PageDefault, deps.PageMax)
	previewC := NewPreviewController(deps.Previews, deps.Limiter, deps.PreviewRate, deps.PreviewRateWindow)
	personalC := NewPersonalController(deps.Personal, deps.Limiter, deps.PersonalRate,
		deps.PersonalRateWindow, deps.PageDefault, deps.PageMax)
	linkC := NewResourceLinkController(deps.Links, deps.Limiter, deps.LinkRate,
		deps.LinkRateWindow)

	rt := &routes{authn: deps.Authenticator}
	mux := http.NewServeMux()
	const api = "/api/v1"

	mux.Handle("POST "+api+"/auth/register", http.HandlerFunc(authC.Register))
	mux.Handle("POST "+api+"/auth/login", http.HandlerFunc(authC.Login))
	mux.Handle("POST "+api+"/auth/refresh", http.HandlerFunc(authC.Refresh))
	mux.Handle("POST "+api+"/auth/logout", http.HandlerFunc(authC.Logout))
	mux.Handle("POST "+api+"/auth/verify-email", http.HandlerFunc(authC.VerifyEmail))
	mux.Handle("POST "+api+"/auth/verify-email/resend", http.HandlerFunc(authC.ResendVerification))
	mux.Handle("POST "+api+"/auth/password/forgot", http.HandlerFunc(authC.ForgotPassword))
	mux.Handle("POST "+api+"/auth/password/reset", http.HandlerFunc(authC.ResetPassword))
	mux.Handle("POST "+api+"/auth/email-change/confirm", http.HandlerFunc(authC.ConfirmEmailChange))
	mux.Handle("GET "+api+"/auth/csrf", http.HandlerFunc(authC.CSRF))
	mux.Handle("POST "+api+"/auth/logout-all", rt.authd(authC.LogoutAll))

	mux.Handle("GET "+api+"/invites/{token}", http.HandlerFunc(inviteC.Preview))
	mux.Handle("POST "+api+"/invites/accept", http.HandlerFunc(inviteC.Accept))

	mux.Handle("GET "+api+"/me", rt.authd(profileC.Get))
	mux.Handle("PATCH "+api+"/me", rt.authd(profileC.Update))
	mux.Handle("POST "+api+"/me/telegram/link", rt.authd(profileC.TelegramLink))
	mux.Handle("DELETE "+api+"/me/telegram", rt.authd(profileC.TelegramUnlink))
	mux.Handle("POST "+api+"/me/email-change", rt.authd(profileC.ChangeEmail))
	mux.Handle("POST "+api+"/me/deactivate", rt.authd(profileC.Deactivate))
	mux.Handle("GET "+api+"/me/sessions", rt.authd(sessionC.List))
	mux.Handle("DELETE "+api+"/me/sessions/{id}", rt.authd(sessionC.Revoke))

	mux.Handle("GET "+api+"/me/events", rt.authd(queryC.MyEvents))
	mux.Handle("GET "+api+"/me/schedule", rt.authd(queryC.MySchedule))
	mux.Handle("GET "+api+"/catalog", rt.authd(catalogC.List))
	mux.Handle("POST "+api+"/events/{id}/join", rt.authd(catalogC.Join))
	mux.Handle("GET "+api+"/events/{id}", rt.authd(queryC.EventCard))
	mux.Handle("GET "+api+"/events/{id}/stages", rt.authd(eventC.ListStages))
	mux.Handle("POST "+api+"/events/{id}/registration/done", rt.authd(regC.MarkDone))

	mountPersonal(mux, rt, api, personalC)
	mountResourceLinks(mux, rt, api, linkC)
	mountRealtime(mux, rt, api, deps)

	mux.Handle("GET "+api+"/admin/users", rt.admin(userC.Search))
	mux.Handle("POST "+api+"/admin/users/{id}/deactivate", rt.admin(userC.Deactivate))
	mux.Handle("POST "+api+"/admin/users/{id}/activate", rt.admin(userC.Activate))
	mux.Handle("DELETE "+api+"/admin/users/{id}", rt.admin(userC.Delete))
	mux.Handle("POST "+api+"/admin/invites", rt.admin(inviteC.Create))
	mux.Handle("GET "+api+"/admin/invites", rt.admin(inviteC.List))
	mux.Handle("POST "+api+"/admin/invites/{id}/revoke", rt.admin(inviteC.Revoke))

	mux.Handle("GET "+api+"/admin/events", rt.admin(eventC.List))
	mux.Handle("POST "+api+"/admin/events", rt.admin(eventC.Create))
	mux.Handle("GET "+api+"/admin/events/{id}", rt.admin(eventC.Get))
	mux.Handle("PATCH "+api+"/admin/events/{id}", rt.admin(eventC.Update))
	mux.Handle("POST "+api+"/admin/events/{id}/publish", rt.admin(eventC.Publish))
	mux.Handle("POST "+api+"/admin/events/{id}/archive", rt.admin(eventC.Archive))
	mux.Handle("POST "+api+"/admin/events/{id}/stages", rt.admin(eventC.CreateStage))
	mux.Handle("PATCH "+api+"/admin/stages/{id}", rt.admin(eventC.UpdateStage))
	mux.Handle("DELETE "+api+"/admin/stages/{id}", rt.admin(eventC.DeleteStage))

	mux.Handle("GET "+api+"/admin/events/{id}/participants", rt.admin(partC.List))
	mux.Handle("POST "+api+"/admin/events/{id}/participants/batch-add", rt.admin(partC.AddMany))
	mux.Handle("POST "+api+"/admin/events/{id}/participants/batch-remove", rt.admin(partC.RemoveMany))
	mux.Handle("POST "+api+"/admin/events/{id}/participants/copy-from", rt.admin(partC.CopyFrom))
	mux.Handle("PATCH "+api+"/admin/participants/{id}/team-role", rt.admin(partC.UpdateTeamRole))
	mux.Handle("POST "+api+"/admin/participants/{id}/reactivate", rt.admin(partC.Reactivate))

	mux.Handle("GET "+api+"/admin/events/{id}/registration", rt.admin(regC.Get))
	mux.Handle("POST "+api+"/admin/events/{id}/registration", rt.admin(regC.Create))
	mux.Handle("PATCH "+api+"/admin/events/{id}/registration", rt.admin(regC.Update))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/enable", rt.admin(regC.Enable))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/disable", rt.admin(regC.Disable))
	mux.Handle("GET "+api+"/admin/events/{id}/registration/rules", rt.admin(regC.ListRules))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/rules", rt.admin(regC.CreateRule))
	mux.Handle("PATCH "+api+"/admin/registration-rules/{id}", rt.admin(regC.UpdateRule))
	mux.Handle("DELETE "+api+"/admin/registration-rules/{id}", rt.admin(regC.DisableRule))
	mux.Handle("GET "+api+"/admin/events/{id}/registration-statuses", rt.admin(regC.ListStatuses))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set", rt.admin(regC.BatchSetStatus))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set/preview", rt.admin(regC.BatchSetStatusPreview))
	mux.Handle("PATCH "+api+"/admin/registration-statuses/{id}", rt.admin(regC.AdminChangeStatus))
	mux.Handle("GET "+api+"/admin/registration-statuses/{id}/notification-preview",
		rt.admin(previewC.Notification))

	mux.Handle("GET "+api+"/admin/schedule", rt.admin(queryC.AdminSchedule))
	mux.Handle("GET "+api+"/admin/queries/upcoming", rt.admin(queryC.Upcoming))
	mux.Handle("GET "+api+"/admin/queries/overdue", rt.admin(queryC.Overdue))
	mux.Handle("GET "+api+"/admin/audit", rt.admin(auditC.List))

	mux.Handle("GET "+api+"/healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET "+api+"/readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET "+api+"/ops/worker-heartbeat", http.HandlerFunc(opsC.Heartbeat))
	mux.Handle("GET "+api+"/ops/queue", rt.admin(opsC.Queue))
	mux.Handle("GET "+api+"/metrics", http.HandlerFunc(opsC.Metrics))
	mux.Handle("GET /healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET /readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET /metrics", http.HandlerFunc(opsC.Metrics))

	if deps.SwaggerUI != nil {
		mux.Handle("GET /docs/", deps.SwaggerUI)
		mux.Handle("GET /docs", http.RedirectHandler("/docs/index.html", http.StatusMovedPermanently))
	}

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.Recover,
		middleware.Logging,
		middleware.CORS(deps.CORSOrigins),
		middleware.CSRF,
	)
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
