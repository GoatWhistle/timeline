import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/shared/api/session'
import { Spinner } from '@/shared/ui/spinner'
import { ForbiddenPage } from './pages/forbidden-page'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

/** Маршрут доступен только гостю: вошедшего уводим на главную. */
export function AnonymousOnly() {
  const { isLoading, isAuthenticated } = useSession()
  if (isLoading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}

/** Маршрут требует сессии. Исходный путь сохраняется для возврата после входа. */
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useSession()
  const location = useLocation()
  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

/** Административная ветка. Отказ показывается страницей, а не редиректом. */
export function RequireAdmin() {
  const { isLoading, isAdmin } = useSession()
  if (isLoading) return <FullPageSpinner />
  if (!isAdmin) return <ForbiddenPage />
  return <Outlet />
}
