package controllers

import (
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
)

// Deps — зависимости роутера: сервисы предметных областей и параметры транспорта.
type Deps struct {
	Auth          AuthService
	Invites       InviteService
	Profile       ProfileService
	Users         UserService
	Hackathons    HackathonService
	Stages        StageService
	Participants  ParticipantService
	Registrations RegistrationService
	Statuses      StatusService
	Rules         RuleService
	Queries       QueryService
	Audit         AuditService
	Ops           OpsService

	Authenticator middleware.Authenticator
	Metrics       http.Handler
	SwaggerUI     http.Handler

	Cookies      CookieOptions
	PublicURL    string
	CORSOrigins  []string
	MetricsToken string
	PageDefault  int
	PageMax      int
	UserPageSize int
	CSRFTTL      time.Duration
}

// NewRouter собирает HTTP-роутер приложения.
//
//	@title						Hackathon Tracker API
//	@version					0.8.0
//	@description				REST API системы Hackathon Tracker. Реализует техническое задание v0.8:
//	@description				учётные записи и приглашения, хакатоны и этапы, назначения участников,
//	@description				регистрацию с самоотчётом статуса, правила напоминаний и журнал аудита.
//	@description
//	@description				Система не проверяет внешний сайт регистрации: статус является самоотчётом
//	@description				пользователя либо административно установленным состоянием.
//	@description
//	@description				Аутентификация — cookie-схема: access token живёт 15 минут, refresh token
//	@description				ротируется и живёт 30 дней. Все изменяющие запросы обязаны передавать
//	@description				CSRF-токен заголовком X-CSRF-Token; получить его можно на GET /auth/csrf.
//	@description				Все моменты времени передаются в UTC в формате RFC 3339.
//	@termsOfService				https://github.com/kaifarikman/hackathon-os
//	@contact.name				Команда Hackathon Tracker
//	@license.name				MIT
//	@host						localhost:8080
//	@BasePath					/api/v1
//	@schemes					http https
//	@securityDefinitions.apikey	CookieAuth
//	@in							cookie
//	@name						access_token
//	@description				Access token в HttpOnly cookie, выдаётся при входе и обновлении сессии.
//	@tag.name					auth
//	@tag.description			Регистрация, вход, сессии и восстановление доступа
//	@tag.name					invites
//	@tag.description			Приглашения на регистрацию
//	@tag.name					profile
//	@tag.description			Собственный профиль и каналы доставки
//	@tag.name					users
//	@tag.description			Административные операции над учётными записями
//	@tag.name					hackathons
//	@tag.description			Хакатоны и их жизненный цикл
//	@tag.name					stages
//	@tag.description			Этапы хакатона
//	@tag.name					participants
//	@tag.description			Состав участников и массовые операции
//	@tag.name					registration
//	@tag.description			Регистрация хакатона и статусы участников
//	@tag.name					rules
//	@tag.description			Правила напоминаний
//	@tag.name					queries
//	@tag.description			Read-модели: мои хакатоны, карточка, временная шкала, дедлайны
//	@tag.name					audit
//	@tag.description			Журнал административных изменений
//	@tag.name					ops
//	@tag.description			Служебные проверки и метрики
func NewRouter(deps Deps) http.Handler {
	authC := NewAuthController(deps.Auth, deps.Cookies, deps.CSRFTTL)
	inviteC := NewInviteController(deps.Invites, deps.Cookies, deps.PublicURL, deps.CSRFTTL, deps.PageDefault, deps.PageMax)
	profileC := NewProfileController(deps.Profile, deps.Cookies)
	userC := NewUserController(deps.Users, deps.UserPageSize, deps.PageMax)
	hackC := NewHackathonController(deps.Hackathons, deps.Stages, deps.PageDefault, deps.PageMax)
	partC := NewParticipantController(deps.Participants, deps.PageDefault, deps.PageMax)
	regC := NewRegistrationController(deps.Registrations, deps.Statuses, deps.Rules, deps.PageDefault, deps.PageMax)
	queryC := NewQueryController(deps.Queries, deps.PageDefault, deps.PageMax)
	auditC := NewAuditController(deps.Audit, deps.PageDefault, deps.PageMax)
	opsC := NewOpsController(deps.Ops, deps.MetricsToken, deps.Metrics)

	rt := &routes{authn: deps.Authenticator}
	mux := http.NewServeMux()
	const api = "/api/v1"

	// Публичные endpoint аутентификации.
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

	// Публичные endpoint приглашений.
	mux.Handle("GET "+api+"/invites/{token}", http.HandlerFunc(inviteC.Preview))
	mux.Handle("POST "+api+"/invites/accept", http.HandlerFunc(inviteC.Accept))

	// Профиль.
	mux.Handle("GET "+api+"/me", rt.authd(profileC.Get))
	mux.Handle("PATCH "+api+"/me", rt.authd(profileC.Update))
	mux.Handle("POST "+api+"/me/telegram/link", rt.authd(profileC.TelegramLink))
	mux.Handle("DELETE "+api+"/me/telegram", rt.authd(profileC.TelegramUnlink))
	mux.Handle("POST "+api+"/me/email-change", rt.authd(profileC.ChangeEmail))
	mux.Handle("POST "+api+"/me/deactivate", rt.authd(profileC.Deactivate))

	// Пользовательские read-модели.
	mux.Handle("GET "+api+"/me/hackathons", rt.authd(queryC.MyHackathons))
	mux.Handle("GET "+api+"/me/timeline", rt.authd(queryC.MyTimeline))
	mux.Handle("GET "+api+"/hackathons/{id}", rt.authd(queryC.HackathonCard))
	mux.Handle("GET "+api+"/hackathons/{id}/stages", rt.authd(hackC.ListStages))
	mux.Handle("POST "+api+"/hackathons/{id}/registration/done", rt.authd(regC.MarkDone))

	// Администрирование: пользователи и приглашения.
	mux.Handle("GET "+api+"/admin/users", rt.admin(userC.Search))
	mux.Handle("POST "+api+"/admin/users/{id}/deactivate", rt.admin(userC.Deactivate))
	mux.Handle("POST "+api+"/admin/users/{id}/activate", rt.admin(userC.Activate))
	mux.Handle("DELETE "+api+"/admin/users/{id}", rt.admin(userC.Delete))
	mux.Handle("POST "+api+"/admin/invites", rt.admin(inviteC.Create))
	mux.Handle("GET "+api+"/admin/invites", rt.admin(inviteC.List))
	mux.Handle("POST "+api+"/admin/invites/{id}/revoke", rt.admin(inviteC.Revoke))

	// Администрирование: хакатоны и этапы.
	mux.Handle("GET "+api+"/admin/hackathons", rt.admin(hackC.List))
	mux.Handle("POST "+api+"/admin/hackathons", rt.admin(hackC.Create))
	mux.Handle("GET "+api+"/admin/hackathons/{id}", rt.admin(hackC.Get))
	mux.Handle("PATCH "+api+"/admin/hackathons/{id}", rt.admin(hackC.Update))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/publish", rt.admin(hackC.Publish))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/archive", rt.admin(hackC.Archive))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/stages", rt.admin(hackC.CreateStage))
	mux.Handle("PATCH "+api+"/admin/stages/{id}", rt.admin(hackC.UpdateStage))
	mux.Handle("DELETE "+api+"/admin/stages/{id}", rt.admin(hackC.DeleteStage))

	// Администрирование: участники.
	mux.Handle("GET "+api+"/admin/hackathons/{id}/participants", rt.admin(partC.List))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/participants/batch-add", rt.admin(partC.AddMany))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/participants/batch-remove", rt.admin(partC.RemoveMany))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/participants/copy-from", rt.admin(partC.CopyFrom))
	mux.Handle("PATCH "+api+"/admin/participants/{id}/team-role", rt.admin(partC.UpdateTeamRole))
	mux.Handle("POST "+api+"/admin/participants/{id}/reactivate", rt.admin(partC.Reactivate))

	// Администрирование: регистрация, статусы и правила.
	mux.Handle("GET "+api+"/admin/hackathons/{id}/registration", rt.admin(regC.Get))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration", rt.admin(regC.Create))
	mux.Handle("PATCH "+api+"/admin/hackathons/{id}/registration", rt.admin(regC.Update))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration/enable", rt.admin(regC.Enable))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration/disable", rt.admin(regC.Disable))
	mux.Handle("GET "+api+"/admin/hackathons/{id}/registration/rules", rt.admin(regC.ListRules))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration/rules", rt.admin(regC.CreateRule))
	mux.Handle("PATCH "+api+"/admin/registration-rules/{id}", rt.admin(regC.UpdateRule))
	mux.Handle("DELETE "+api+"/admin/registration-rules/{id}", rt.admin(regC.DisableRule))
	mux.Handle("GET "+api+"/admin/hackathons/{id}/registration-statuses", rt.admin(regC.ListStatuses))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration-statuses/batch-set", rt.admin(regC.BatchSetStatus))
	mux.Handle("POST "+api+"/admin/hackathons/{id}/registration-statuses/batch-set/preview", rt.admin(regC.BatchSetStatusPreview))
	mux.Handle("PATCH "+api+"/admin/registration-statuses/{id}", rt.admin(regC.AdminChangeStatus))

	// Администрирование: временная шкала, выборки дедлайнов и аудит.
	mux.Handle("GET "+api+"/admin/timeline", rt.admin(queryC.AdminTimeline))
	mux.Handle("GET "+api+"/admin/queries/upcoming", rt.admin(queryC.Upcoming))
	mux.Handle("GET "+api+"/admin/queries/overdue", rt.admin(queryC.Overdue))
	mux.Handle("GET "+api+"/admin/audit", rt.admin(auditC.List))

	// Служебные endpoint. Корневые псевдонимы оставлены для проб инфраструктуры.
	mux.Handle("GET "+api+"/healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET "+api+"/readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET "+api+"/ops/worker-heartbeat", http.HandlerFunc(opsC.Heartbeat))
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

// authd требует аутентифицированного пользователя.
func (rt *routes) authd(fn http.HandlerFunc) http.Handler {
	return middleware.Auth(rt.authn)(fn)
}

// admin требует аутентифицированного администратора.
func (rt *routes) admin(fn http.HandlerFunc) http.Handler {
	return middleware.Auth(rt.authn)(middleware.AdminOnly(fn))
}
