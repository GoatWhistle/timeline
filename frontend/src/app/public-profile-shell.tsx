import { useSession } from '@/shared/api/session'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { AppShell } from './app-shell'
import { PublicShell } from './public-shell'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function PublicProfileShell() {
  const { isLoading, isAuthenticated } = useSession()
  if (isLoading) return <FullPageSpinner />
  return isAuthenticated ? <AppShell /> : <PublicShell />
}
