package controllers

import "net/http"

func mountAuth(mux *http.ServeMux, rt *routes, api string,
	authC *AuthController, inviteC *InviteController,
) {
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
}

func mountMe(mux *http.ServeMux, rt *routes, api string,
	profileC *ProfileController, sessionC *SessionController, queryC *QueryController,
	catalogC *CatalogController, eventC *EventController, statusC *RegistrationStatusController,
) {
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
	mux.Handle("POST "+api+"/events/{id}/registration/done", rt.authd(statusC.MarkDone))
}

func mountAdminIdentity(mux *http.ServeMux, rt *routes, api string,
	userC *UserController, inviteC *InviteController, eventC *EventController,
) {
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
}

func mountAdminRegistration(mux *http.ServeMux, rt *routes, api string,
	partC *ParticipantController, regC *RegistrationController,
	statusC *RegistrationStatusController, ruleC *NotificationRuleController,
	previewC *PreviewController,
) {
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
	mux.Handle("GET "+api+"/admin/events/{id}/registration/rules", rt.admin(ruleC.ListRules))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/rules", rt.admin(ruleC.CreateRule))
	mux.Handle("PATCH "+api+"/admin/registration-rules/{id}", rt.admin(ruleC.UpdateRule))
	mux.Handle("DELETE "+api+"/admin/registration-rules/{id}", rt.admin(ruleC.DisableRule))
	mux.Handle("GET "+api+"/admin/events/{id}/registration-statuses", rt.admin(statusC.ListStatuses))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set", rt.admin(statusC.BatchSetStatus))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set/preview",
		rt.admin(statusC.BatchSetStatusPreview))
	mux.Handle("PATCH "+api+"/admin/registration-statuses/{id}", rt.admin(statusC.AdminChangeStatus))
	mux.Handle("GET "+api+"/admin/registration-statuses/{id}/notification-preview",
		rt.admin(previewC.Notification))
}

func mountAdminQueries(mux *http.ServeMux, rt *routes, api string,
	queryC *QueryController, auditC *AuditController, opsC *OpsController,
) {
	mux.Handle("GET "+api+"/admin/schedule", rt.admin(queryC.AdminSchedule))
	mux.Handle("GET "+api+"/admin/queries/upcoming", rt.admin(queryC.Upcoming))
	mux.Handle("GET "+api+"/admin/queries/overdue", rt.admin(queryC.Overdue))
	mux.Handle("GET "+api+"/admin/queries/registration-coverage", rt.admin(queryC.RegistrationCoverage))
	mux.Handle("GET "+api+"/admin/audit", rt.admin(auditC.List))

	mux.Handle("GET "+api+"/healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET "+api+"/readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET "+api+"/ops/worker-heartbeat", http.HandlerFunc(opsC.Heartbeat))
	mux.Handle("GET "+api+"/ops/queue", rt.admin(opsC.Queue))
	mux.Handle("GET "+api+"/metrics", http.HandlerFunc(opsC.Metrics))
	mux.Handle("GET /healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET /readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET /metrics", http.HandlerFunc(opsC.Metrics))
}
