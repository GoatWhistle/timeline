import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/shared/ui/brand/wordmark'

export function AuthBrandBar() {
  const { t } = useTranslation('auth')

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Wordmark to="/login" />
      <p className="max-w-xs text-balance text-copy text-muted-foreground">{t('door.pitch')}</p>
    </div>
  )
}
