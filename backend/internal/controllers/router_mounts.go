package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/auth"
	"github.com/GoatWhistle/timeline/internal/controllers/event"
	"github.com/GoatWhistle/timeline/internal/controllers/finance"
	"github.com/GoatWhistle/timeline/internal/controllers/inbox"
	"github.com/GoatWhistle/timeline/internal/controllers/notification"
	"github.com/GoatWhistle/timeline/internal/controllers/participation"
	"github.com/GoatWhistle/timeline/internal/controllers/team"
)

func mountAuth(mux *http.ServeMux, rt *routes, api string,
	authC *auth.Controller,
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
	mux.Handle("POST "+api+"/auth/email-change/cancel", http.HandlerFunc(authC.CancelEmailChange))
	mux.Handle("GET "+api+"/auth/csrf", http.HandlerFunc(authC.CSRF))
	mux.Handle("POST "+api+"/auth/logout-all", rt.authd(authC.LogoutAll))
	mux.Handle("POST "+api+"/auth/password/change", rt.authd(authC.ChangePassword))
}

func mountPublicProfile(mux *http.ServeMux, rt *routes, api string, c *auth.PublicProfileController) {
	mux.Handle("GET "+api+"/profiles/{nickname}", rt.optional(c.Get))
}

func mountMe(mux *http.ServeMux, rt *routes, api string,
	profileC *auth.ProfileController, sessionC *auth.SessionController, queryC *event.QueryController,
	catalogC *event.CatalogController, eventC *event.Controller, statusC *participation.RegistrationStatusController,
	profileLinkC *auth.ProfileLinkController, avatarC *auth.AvatarController, inboxC *inbox.Controller,
) {
	mux.Handle("GET "+api+"/me", rt.authd(profileC.Get))
	mux.Handle("POST "+api+"/me/avatar", rt.authd(avatarC.Upload))
	mux.Handle("DELETE "+api+"/me/avatar", rt.authd(avatarC.Remove))
	mux.Handle("GET "+api+"/avatars/{key}", rt.authd(avatarC.Serve))
	mux.Handle("PATCH "+api+"/me", rt.authd(profileC.Update))
	mux.Handle("GET "+api+"/me/shortcuts", rt.authd(profileC.Shortcuts))
	mux.Handle("PUT "+api+"/me/shortcuts", rt.authd(profileC.UpdateShortcuts))
	mux.Handle("DELETE "+api+"/me/shortcuts", rt.authd(profileC.ResetShortcuts))
	mux.Handle("POST "+api+"/me/telegram/link", rt.authd(profileC.TelegramLink))
	mux.Handle("DELETE "+api+"/me/telegram", rt.authd(profileC.TelegramUnlink))
	mux.Handle("POST "+api+"/me/email-change", rt.authd(profileC.ChangeEmail))
	mux.Handle("POST "+api+"/me/deactivate", rt.authd(profileC.Deactivate))
	mux.Handle("GET "+api+"/me/profile-links", rt.authd(profileLinkC.List))
	mux.Handle("POST "+api+"/me/profile-links", rt.authd(profileLinkC.Create))
	mux.Handle("PUT "+api+"/me/profile-links/order", rt.authd(profileLinkC.Reorder))
	mux.Handle("PATCH "+api+"/me/profile-links/{id}", rt.authd(profileLinkC.Update))
	mux.Handle("DELETE "+api+"/me/profile-links/{id}", rt.authd(profileLinkC.Delete))
	mux.Handle("GET "+api+"/me/reminder-schedule", rt.authd(profileC.ReminderSchedule))
	mux.Handle("PUT "+api+"/me/reminder-schedule", rt.authd(profileC.UpdateReminderSchedule))
	mux.Handle("GET "+api+"/me/session-policy", rt.authd(profileC.SessionPolicy))
	mux.Handle("PUT "+api+"/me/session-policy", rt.authd(profileC.UpdateSessionPolicy))
	mux.Handle("GET "+api+"/me/notification-preferences", rt.authd(profileC.NotificationPreferences))
	mux.Handle("PUT "+api+"/me/notification-preferences/{occasion}/{channel}",
		rt.authd(profileC.SetNotificationPreference))
	mux.Handle("GET "+api+"/me/sessions", rt.authd(sessionC.List))
	mux.Handle("PATCH "+api+"/me/sessions/{id}", rt.authd(sessionC.Rename))
	mux.Handle("DELETE "+api+"/me/sessions/{id}", rt.authd(sessionC.Revoke))

	mux.Handle("GET "+api+"/me/events", rt.authd(queryC.MyEvents))
	mux.Handle("GET "+api+"/me/schedule", rt.authd(queryC.MySchedule))
	mux.Handle("GET "+api+"/catalog", rt.authd(catalogC.List))
	mux.Handle("GET "+api+"/catalog/export", rt.authd(catalogC.Export))
	mux.Handle("GET "+api+"/catalog/{id}", rt.authd(catalogC.Get))
	mux.Handle("GET "+api+"/organizers", rt.authd(catalogC.Organizers))
	mux.Handle("POST "+api+"/events/{id}/join", rt.authd(catalogC.Join))
	mux.Handle("GET "+api+"/events/{id}", rt.authd(queryC.EventCard))
	mux.Handle("GET "+api+"/events/{id}/stages", rt.authd(eventC.ListStages))
	mux.Handle("GET "+api+"/events/{id}/tracks", rt.authd(eventC.ListTracks))
	mux.Handle("POST "+api+"/events/{id}/registration/done", rt.authd(statusC.MarkDone))

	mux.Handle("GET "+api+"/me/inbox", rt.authd(inboxC.List))
	mux.Handle("DELETE "+api+"/me/inbox", rt.authd(inboxC.DeleteAll))
	mux.Handle("GET "+api+"/me/inbox/unread-count", rt.authd(inboxC.UnreadCount))
	mux.Handle("POST "+api+"/me/inbox/read", rt.authd(inboxC.MarkRead))
	mux.Handle("DELETE "+api+"/me/inbox/{id}", rt.authd(inboxC.Delete))
	mux.Handle("POST "+api+"/me/inbox/{id}/restore", rt.authd(inboxC.Restore))
	mux.Handle("POST "+api+"/me/inbox/{id}/mark-registered", rt.authd(inboxC.MarkRegistered))
}

func mountAdminIdentity(mux *http.ServeMux, rt *routes, api string,
	userC *auth.UserController, eventC *event.Controller,
) {
	mux.Handle("GET "+api+"/admin/users", rt.admin(userC.Search))
	mux.Handle("GET "+api+"/admin/users/export", rt.admin(userC.Export))
	mux.Handle("POST "+api+"/admin/users/{id}/deactivate", rt.admin(userC.Deactivate))
	mux.Handle("POST "+api+"/admin/users/{id}/activate", rt.admin(userC.Activate))
	mux.Handle("DELETE "+api+"/admin/users/{id}", rt.admin(userC.Delete))
	mux.Handle("GET "+api+"/admin/events", rt.admin(eventC.List))
	mux.Handle("GET "+api+"/admin/events/export", rt.admin(eventC.Export))
	mux.Handle("POST "+api+"/admin/events", rt.admin(eventC.Create))
	mux.Handle("GET "+api+"/admin/events/{id}", rt.admin(eventC.Get))
	mux.Handle("PATCH "+api+"/admin/events/{id}", rt.admin(eventC.Update))
	mux.Handle("POST "+api+"/admin/events/{id}/publish", rt.admin(eventC.Publish))
	mux.Handle("POST "+api+"/admin/events/{id}/archive", rt.admin(eventC.Archive))
	mux.Handle("DELETE "+api+"/admin/events/{id}", rt.admin(eventC.Delete))
	mux.Handle("POST "+api+"/admin/events/{id}/stages", rt.admin(eventC.CreateStage))
	mux.Handle("PATCH "+api+"/admin/stages/{id}", rt.admin(eventC.UpdateStage))
	mux.Handle("DELETE "+api+"/admin/stages/{id}", rt.admin(eventC.DeleteStage))
	mux.Handle("POST "+api+"/admin/events/{id}/tracks", rt.admin(eventC.CreateTrack))
	mux.Handle("PATCH "+api+"/admin/tracks/{id}", rt.admin(eventC.UpdateTrack))
	mux.Handle("DELETE "+api+"/admin/tracks/{id}", rt.admin(eventC.DeleteTrack))
}

func mountAdminRegistration(mux *http.ServeMux, rt *routes, api string,
	partC *participation.Controller, regC *participation.RegistrationController,
	statusC *participation.RegistrationStatusController,
	previewC *notification.PreviewController,
) {
	mux.Handle("GET "+api+"/admin/events/{id}/participants", rt.admin(partC.List))
	mux.Handle("POST "+api+"/admin/events/{id}/participants/batch-remove", rt.admin(partC.RemoveMany))
	mux.Handle("PATCH "+api+"/admin/participants/{id}/team-role", rt.admin(partC.UpdateTeamRole))

	mux.Handle("GET "+api+"/admin/events/{id}/registration", rt.admin(regC.Get))
	mux.Handle("POST "+api+"/admin/events/{id}/registration", rt.admin(regC.Create))
	mux.Handle("PATCH "+api+"/admin/events/{id}/registration", rt.admin(regC.Update))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/enable", rt.admin(regC.Enable))
	mux.Handle("POST "+api+"/admin/events/{id}/registration/disable", rt.admin(regC.Disable))
	mux.Handle("GET "+api+"/admin/events/{id}/registration-statuses", rt.admin(statusC.ListStatuses))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set", rt.admin(statusC.BatchSetStatus))
	mux.Handle("POST "+api+"/admin/events/{id}/registration-statuses/batch-set/preview",
		rt.admin(statusC.BatchSetStatusPreview))
	mux.Handle("PATCH "+api+"/admin/registration-statuses/{id}", rt.admin(statusC.AdminChangeStatus))
	mux.Handle("GET "+api+"/admin/registration-statuses/{id}/notification-preview",
		rt.admin(previewC.Notification))
}

func mountAdminQueries(mux *http.ServeMux, rt *routes, api string,
	queryC *event.QueryController, auditC *notification.AuditController, opsC *notification.OpsController,
) {
	mux.Handle("GET "+api+"/admin/queries/upcoming", rt.admin(queryC.Upcoming))
	mux.Handle("GET "+api+"/admin/queries/overdue", rt.admin(queryC.Overdue))
	mux.Handle("GET "+api+"/admin/queries/registration-coverage", rt.admin(queryC.RegistrationCoverage))
	mux.Handle("GET "+api+"/admin/audit", rt.admin(auditC.List))
	mux.Handle("GET "+api+"/admin/audit/export", rt.admin(auditC.Export))

	mux.Handle("GET "+api+"/healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET "+api+"/readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET "+api+"/metrics", http.HandlerFunc(opsC.Metrics))
	mux.Handle("GET /healthz", http.HandlerFunc(opsC.Health))
	mux.Handle("GET /readyz", http.HandlerFunc(opsC.Ready))
	mux.Handle("GET /metrics", http.HandlerFunc(opsC.Metrics))
}

func mountTeams(mux *http.ServeMux, rt *routes, api string, c *team.Controller) {
	mux.Handle("GET "+api+"/teams", rt.authd(c.List))
	mux.Handle("POST "+api+"/teams", rt.authd(c.Create))
	mux.Handle("GET "+api+"/teams/{id}", rt.authd(c.Get))
	mux.Handle("PATCH "+api+"/teams/{id}", rt.authd(c.Rename))
	mux.Handle("POST "+api+"/teams/{id}/invitations", rt.authd(c.Invite))
	mux.Handle("POST "+api+"/teams/{id}/membership", rt.authd(c.Accept))
	mux.Handle("DELETE "+api+"/teams/{id}/membership", rt.authd(c.Leave))
	mux.Handle("DELETE "+api+"/teams/{id}/members/{user_id}", rt.authd(c.Remove))
	mux.Handle("GET "+api+"/teams/{id}/events", rt.authd(c.ListEvents))
	mux.Handle("POST "+api+"/teams/{id}/events", rt.authd(c.EnterEvent))
	mux.Handle("GET "+api+"/teams/{id}/events/{event_id}", rt.authd(c.EventStanding))
	mux.Handle("PUT "+api+"/teams/{id}/events/{event_id}/track", rt.authd(c.ChooseTrack))
	mux.Handle("PUT "+api+"/teams/{id}/events/{event_id}/roster/{user_id}", rt.authd(c.AddToRoster))
	mux.Handle("DELETE "+api+"/teams/{id}/events/{event_id}/roster/{user_id}",
		rt.authd(c.RemoveFromRoster))
	mux.Handle("POST "+api+"/teams/{id}/events/{event_id}/roster/{user_id}/registration/done",
		rt.authd(c.MarkRosterMember))
	mux.Handle("GET "+api+"/teams/{id}/join-link", rt.authd(c.JoinLink))
	mux.Handle("POST "+api+"/teams/{id}/join-link", rt.authd(c.RotateJoinLink))
	mux.Handle("DELETE "+api+"/teams/{id}/join-link", rt.authd(c.RevokeJoinLink))
	mux.Handle("POST "+api+"/team-join/{token}", rt.authd(c.JoinByLink))
	mux.Handle("GET "+api+"/teams/{id}/events/{event_id}/links", rt.authd(c.ListEventLinks))
	mux.Handle("POST "+api+"/teams/{id}/events/{event_id}/links", rt.authd(c.AddEventLink))
	mux.Handle("PUT "+api+"/teams/{id}/events/{event_id}/links/order", rt.authd(c.ReorderEventLinks))
	mux.Handle("PATCH "+api+"/team-links/{id}", rt.authd(c.UpdateEventLink))
	mux.Handle("DELETE "+api+"/team-links/{id}", rt.authd(c.RemoveEventLink))
}

func mountFinance(mux *http.ServeMux, rt *routes, api string, c *finance.Controller) {
	mux.Handle("GET "+api+"/events/{id}/finance", rt.authd(c.Summary))
	mux.Handle("GET "+api+"/events/{id}/finance/export", rt.authd(c.Export))
	mux.Handle("GET "+api+"/events/{id}/cases", rt.authd(c.ListCases))
	mux.Handle("POST "+api+"/admin/events/{id}/cases", rt.admin(c.CreateCase))
	mux.Handle("PATCH "+api+"/admin/cases/{id}", rt.admin(c.UpdateCase))
	mux.Handle("DELETE "+api+"/admin/cases/{id}", rt.admin(c.DeleteCase))
}

func mountRetention(mux *http.ServeMux, rt *routes, api string, c *event.RetentionController) {
	mux.Handle("GET "+api+"/admin/retention-settings", rt.admin(c.Get))
	mux.Handle("PATCH "+api+"/admin/retention-settings", rt.admin(c.Update))
	mux.Handle("POST "+api+"/admin/events/{id}/purge-cancel", rt.admin(c.CancelPurge))
}

func mountCovers(mux *http.ServeMux, rt *routes, api string, c *event.CoverController) {
	mux.Handle("GET "+api+"/covers/{key}", rt.authd(c.Serve))
	mux.Handle("POST "+api+"/admin/events/{id}/cover", rt.admin(c.Upload))
	mux.Handle("DELETE "+api+"/admin/events/{id}/cover", rt.admin(c.Remove))
	mux.Handle("POST "+api+"/admin/events/{id}/cover/refresh", rt.admin(c.Refresh))
}
