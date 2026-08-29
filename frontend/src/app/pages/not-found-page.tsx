import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-semibold text-screen">{t('page.notFoundTitle')}</h1>
      <p className="text-muted-foreground text-copy">{t('page.notFoundHint')}</p>
      <Button asChild variant="outline">
        <Link to="/">{t('action.home')}</Link>
      </Button>
    </div>
  )
}
