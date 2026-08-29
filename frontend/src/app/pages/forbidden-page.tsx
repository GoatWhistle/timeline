import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

export function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <h1 className="font-semibold text-screen">{t('page.forbiddenTitle')}</h1>
        <p className="text-muted-foreground text-copy">{t('page.forbiddenHint')}</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">{t('action.home')}</Link>
      </Button>
    </div>
  )
}
