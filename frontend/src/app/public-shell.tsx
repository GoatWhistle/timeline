import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'
import { AuthLanguageSwitch } from '@/features/auth/door/auth-language-switch'
import { Wordmark } from '@/shared/ui/brand/wordmark'
import { Button } from '@/shared/ui/primitives/button'
import { RouteFallback } from './route-fallback'

export function PublicShell() {
  const { t } = useTranslation('auth')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-border border-b px-6 py-4">
        <Wordmark to="/login" />
        <div className="flex items-center gap-2">
          <AuthLanguageSwitch />
          <Button asChild variant="outline" size="sm">
            <Link to="/login">{t('login.title')}</Link>
          </Button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
