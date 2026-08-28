import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { setUnauthenticatedHandler } from '@/shared/api/client'
import { AppShell } from './app-shell'
import { AuthLayout } from './auth-layout'
import { AnonymousOnly, RequireAdmin, RequireAuth } from './guards'
import {
  AdminAuditPage,
  AdminDeadlinesPage,
  AdminEventPage,
  AdminEventsPage,
  AdminInvitesPage,
  AdminSchedulePage,
  AdminUsersPage,
  EmailChangeConfirmPage,
  EventCardPage,
  ForgotPasswordPage,
  InvitePage,
  LoginPage,
  MyEventsPage,
  MySchedulePage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from './lazy-pages'
import { ForbiddenPage } from './pages/forbidden-page'
import { NotFoundPage } from './pages/not-found-page'

function UnauthenticatedRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    setUnauthenticatedHandler(() => navigate('/login', { replace: true }))
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
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<MyEventsPage />} />
            <Route path="/events/:id" element={<EventCardPage />} />
            <Route path="/schedule" element={<MySchedulePage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin/events" element={<AdminEventsPage />} />
              <Route path="/admin/events/:id" element={<AdminEventPage />} />
              <Route path="/admin/schedule" element={<AdminSchedulePage />} />
              <Route path="/admin/deadlines" element={<AdminDeadlinesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/invites" element={<AdminInvitesPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>

            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
