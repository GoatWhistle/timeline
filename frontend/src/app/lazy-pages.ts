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

export const MyEventsPage = lazy(() =>
  import('@/features/event-list/my/event-list').then((m) => ({ default: m.MyEventsPage })),
)
export const EventCardPage = lazy(() =>
  import('@/features/event-card/event-card').then((m) => ({
    default: m.EventCardPage,
  })),
)
export const MySchedulePage = lazy(() =>
  import('@/features/schedule/my/schedule').then((m) => ({ default: m.MySchedulePage })),
)
export const ProfilePage = lazy(() =>
  import('@/features/profile/profile').then((m) => ({ default: m.ProfilePage })),
)

const adminBundle = () => import('./admin-routes')

export const AdminEventsPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminEventsPage })),
)
export const AdminEventPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminEventPage })))
export const AdminSchedulePage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminSchedulePage })),
)
export const AdminDeadlinesPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminDeadlinesPage })),
)
export const AdminUsersPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminUsersPage })))
export const AdminInvitesPage = lazy(() =>
  adminBundle().then((m) => ({ default: m.AdminInvitesPage })),
)
export const AdminAuditPage = lazy(() => adminBundle().then((m) => ({ default: m.AdminAuditPage })))
