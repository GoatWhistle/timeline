import { lazy } from 'react'

export const LoginPage = lazy(() =>
  import('@/features/auth/login/login').then((m) => ({ default: m.LoginPage })),
)
export const RegisterPage = lazy(() =>
  import('@/features/auth/register/register').then((m) => ({ default: m.RegisterPage })),
)
export const VerifyEmailPage = lazy(() =>
  import('@/features/auth/verify-email/verify-email').then((m) => ({ default: m.VerifyEmailPage })),
)
export const ForgotPasswordPage = lazy(() =>
  import('@/features/password-reset/request/password-reset-request').then((m) => ({
    default: m.PasswordResetRequest,
  })),
)
export const ResetPasswordPage = lazy(() =>
  import('@/features/password-reset/confirm/password-reset-confirm').then((m) => ({
    default: m.PasswordResetConfirm,
  })),
)
export const InvitePage = lazy(() =>
  import('@/features/auth/invite/invite').then((m) => ({ default: m.InvitePage })),
)
export const EmailChangeConfirmPage = lazy(() =>
  import('@/features/auth/email-change-confirm/email-change-confirm').then((m) => ({
    default: m.EmailChangeConfirmPage,
  })),
)
export const EmailChangeCancelPage = lazy(() =>
  import('@/features/auth/email-change-cancel/email-change-cancel').then((m) => ({
    default: m.EmailChangeCancelPage,
  })),
)

export const CatalogPage = lazy(() =>
  import('@/features/catalog/catalog').then((m) => ({ default: m.CatalogPage })),
)
export const EventCardPage = lazy(() =>
  import('@/features/event-card/event-card').then((m) => ({
    default: m.EventCardPage,
  })),
)
export const MySchedulePage = lazy(() =>
  import('@/features/schedule/my/schedule').then((m) => ({ default: m.MySchedulePage })),
)
export const HistoryPage = lazy(() =>
  import('@/features/personal-history/history').then((m) => ({ default: m.HistoryPage })),
)
export const SettingsPage = lazy(() =>
  import('@/features/settings/settings').then((m) => ({ default: m.SettingsPage })),
)
export const TeamsPage = lazy(() =>
  import('@/features/teams/teams').then((m) => ({ default: m.TeamsPage })),
)
export const TeamLayout = lazy(() =>
  import('@/features/teams/team-layout').then((m) => ({ default: m.TeamLayout })),
)
export const TeamOverviewPage = lazy(() =>
  import('@/features/teams/team-overview').then((m) => ({ default: m.TeamOverview })),
)
export const TeamMembersPage = lazy(() =>
  import('@/features/teams/team-members').then((m) => ({ default: m.TeamMembers })),
)
export const TeamEventsPage = lazy(() =>
  import('@/features/teams/team-events').then((m) => ({ default: m.TeamEvents })),
)
export const TeamEventDetailPage = lazy(() =>
  import('@/features/teams/team-event-detail').then((m) => ({ default: m.TeamEventDetail })),
)
export const TeamJoinPage = lazy(() =>
  import('@/features/teams/team-join').then((m) => ({ default: m.TeamJoinPage })),
)

const adminBundle = () => import('./admin-routes')

export const AdminEventsPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminEventsPage })),
)
export const AdminEventPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminEventPage })))
export const AdminDeadlinesPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminDeadlinesPage })),
)
export const AdminUsersPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminUsersPage })))
export const AdminInvitesPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminInvitesPage })),
)
export const AdminAuditPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminAuditPage })))
export const AdminOpsQueuePage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminOpsQueuePage })),
)
export const AdminRetentionPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminRetentionPage })),
)
export const PublicProfilePage = lazy(() =>
  import('@/features/public-profile/public-profile').then((m) => ({
    default: m.PublicProfilePage,
  })),
)
export const InboxPage = lazy(() =>
  import('@/features/inbox/inbox-page').then((m) => ({ default: m.InboxPage })),
)
