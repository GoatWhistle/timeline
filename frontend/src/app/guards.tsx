import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/shared/api/session'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { ForbiddenPage } from './pages/forbidden-page'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function AnonymousOnly() {
  const { isLoading, isAuthenticated } = useSession()
  if (isLoading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireAuth() {
  const { isLoading, isAuthenticated } = useSession()
  const location = useLocation()
  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { isLoading, isAdmin } = useSession()
  if (isLoading) return <FullPageSpinner />
  if (!isAdmin) return <ForbiddenPage />
  return <Outlet />
}
