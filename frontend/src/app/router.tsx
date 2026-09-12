import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { setUnauthenticatedHandler } from '@/shared/api/client'
import { AppShell } from './app-shell'
import { AuthLayout } from './auth-layout'
import { AnonymousOnly, RequireAdmin, RequireAuth } from './guards'
import { ScrollPage } from './layouts/scroll-page/scroll-page'
import {
  AdminAuditPage,
  AdminDeadlinesPage,
  AdminEventPage,
  AdminEventsPage,
  AdminInvitesPage,
  AdminOpsQueuePage,
  AdminUsersPage,
  CatalogPage,
  EmailChangeCancelPage,
  EmailChangeConfirmPage,
  EventCardPage,
  ForgotPasswordPage,
  HistoryPage,
  InvitePage,
  LoginPage,
  MySchedulePage,
  RegisterPage,
  ResetPasswordPage,
  SettingsPage,
  TeamEventDetailPage,
  TeamEventsPage,
  TeamJoinPage,
  TeamLayout,
  TeamMembersPage,
  TeamOverviewPage,
  TeamsPage,
  VerifyEmailPage,
} from './lazy-pages'
import { ForbiddenPage } from './pages/forbidden-page'
import { NotFoundPage } from './pages/not-found-page'
import { PublicProfileRoute } from './public-profile-route'

const ANONYMOUS_PATHS = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/email-change',
]

const APP_PATHS = [
  '/events',
  '/catalog',
  '/schedule',
  '/history',
  '/profile',
  '/settings',
  '/teams',
  '/team-join',
  '/admin',
  '/forbidden',
]

export function staysAnonymous(path: string): boolean {
  if (ANONYMOUS_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
    return true
  if (path === '/') return false
  return !APP_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function UnauthenticatedRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      if (staysAnonymous(window.location.pathname)) return
      navigate('/login', { replace: true })
    })
    return () => setUnauthenticatedHandler(() => {})
  }, [navigate])
  return null
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <UnauthenticatedRedirect />
      <Routes>
        <Route element={<AnonymousOnly />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/email-change/confirm" element={<EmailChangeConfirmPage />} />
          <Route path="/email-change/cancel" element={<EmailChangeCancelPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="/events" element={<Navigate to="/catalog?joined=true" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin/events" element={<AdminEventsPage />} />
            </Route>

            <Route element={<ScrollPage />}>
              <Route path="/events/:id" element={<EventCardPage />} />
              <Route path="/schedule" element={<MySchedulePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="/profile"
                element={<Navigate to="/catalog?settings=profile" replace />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:id" element={<TeamLayout />}>
                <Route index element={<TeamOverviewPage />} />
                <Route path="members" element={<TeamMembersPage />} />
                <Route path="events" element={<TeamEventsPage />} />
                <Route path="events/:eventId" element={<TeamEventDetailPage />} />
              </Route>
              <Route path="/team-join/:token" element={<TeamJoinPage />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin/events/:id" element={<AdminEventPage />} />
                <Route path="/admin/deadlines" element={<AdminDeadlinesPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/invites" element={<AdminInvitesPage />} />
                <Route path="/admin/audit" element={<AdminAuditPage />} />
                <Route path="/admin/ops" element={<AdminOpsQueuePage />} />
              </Route>

              <Route path="/forbidden" element={<ForbiddenPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/:handle" element={<PublicProfileRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
