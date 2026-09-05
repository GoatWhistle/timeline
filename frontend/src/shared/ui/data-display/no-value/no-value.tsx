import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export const NO_VALUE_DASH = '—'

export const NO_VALUE_TEXT = 'text-muted-foreground'

export function NoValue({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <span data-slot="no-value" className={cn(NO_VALUE_TEXT, className)}>
      <span aria-hidden="true">{NO_VALUE_DASH}</span>
      <span className="sr-only">{t('novalue.unset')}</span>
    </span>
  )
}
