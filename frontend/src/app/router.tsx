import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { AdminAuditPage } from '@/modules/audit/admin-audit-page'
import { EmailChangeConfirmPage } from '@/modules/auth/email-change-confirm-page'
import { InvitePage } from '@/modules/auth/invite-page'
import { LoginPage } from '@/modules/auth/login-page'
import { ForgotPasswordPage, ResetPasswordPage } from '@/modules/auth/password-pages'
import { RegisterPage } from '@/modules/auth/register-page'
import { VerifyEmailPage } from '@/modules/auth/verify-email-page'
import { AdminDeadlinesPage } from '@/modules/deadlines/admin-deadlines-page'
import { AdminHackathonsPage } from '@/modules/hackathons/admin-hackathons-page'
import { HackathonCardPage } from '@/modules/hackathons/hackathon-card-page'
import { MyHackathonsPage } from '@/modules/hackathons/my-hackathons-page'
import { AdminInvitesPage } from '@/modules/invites/admin-invites-page'
import { ProfilePage } from '@/modules/profile/profile-page'
import { AdminTimelinePage } from '@/modules/timeline/admin-timeline-page'
import { MyTimelinePage } from '@/modules/timeline/my-timeline-page'
import { AdminUsersPage } from '@/modules/users/admin-users-page'
import { setUnauthenticatedHandler } from '@/shared/api/client'
import { AppShell } from './app-shell'
import { AuthLayout } from './auth-layout'
import { AnonymousOnly, RequireAdmin, RequireAuth } from './guards'
import { AdminHackathonPage } from './pages/admin-hackathon-page'
import { ForbiddenPage } from './pages/forbidden-page'
import { NotFoundPage } from './pages/not-found-page'

/**
 * Связывает клиент API с навигацией: когда обновление сессии окончательно
 * провалилось, пользователь уходит на вход.
 */
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

        {/*
          Подтверждение смены email открывается по ссылке из письма и не зависит
          от наличия сессии: до подтверждения вход работает по прежнему адресу.
        */}
        <Route element={<AuthLayout />}>
          <Route path="/email-change/confirm" element={<EmailChangeConfirmPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<MyHackathonsPage />} />
            <Route path="/hackathons/:id" element={<HackathonCardPage />} />
            <Route path="/timeline" element={<MyTimelinePage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin/hackathons" element={<AdminHackathonsPage />} />
              <Route path="/admin/hackathons/:id" element={<AdminHackathonPage />} />
              <Route path="/admin/timeline" element={<AdminTimelinePage />} />
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
