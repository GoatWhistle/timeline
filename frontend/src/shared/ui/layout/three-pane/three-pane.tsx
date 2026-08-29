import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function ThreePane({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 min-w-0 flex-1', className)}>{children}</div>
}

export function ListPane({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col overflow-y-auto', className)}>{children}</div>
  )
}

export function DetailPane({
  open,
  onClose,
  labelledBy,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  labelledBy?: string
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <aside
      aria-label={labelledBy ? undefined : t('pane.details')}
      aria-labelledby={labelledBy}
      className={cn(
        'flex w-detail shrink-0 flex-col overflow-y-auto border-border border-l bg-card',
        'motion-safe:animate-in motion-safe:slide-in-from-right-2 motion-safe:duration-panel',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="sr-only focus:not-sr-only focus:m-2 focus:rounded-control focus:border focus:px-3 focus:py-1.5 focus:text-meta"
      >
        {t('pane.close')}
      </button>
      {children}
    </aside>
  )
}
