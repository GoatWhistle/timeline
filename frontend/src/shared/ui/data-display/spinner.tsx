import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation()
  const text = label ?? t('state.loading')

  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2')}>
      <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  )
}
