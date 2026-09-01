import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation()
  const text = label ?? t('state.loading')

  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2')}>
      <svg
        data-busy-spin
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('size-4 animate-spin ease-linear', className)}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-logo"
        />
      </svg>
      <span className="sr-only">{text}</span>
    </span>
  )
}
