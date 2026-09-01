import { useTranslation } from 'react-i18next'
import type { QueueScope } from '@/entities/ops'
import { cn } from '@/shared/styling/class-names/class-names'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

const SCOPES: { id: QueueScope; labelKey: string }[] = [
  { id: 'failures', labelKey: 'ops:scope.failures' },
  { id: 'stuck-leases', labelKey: 'ops:scope.stuckLeases' },
]

export function ScopeTabs({
  value,
  onChange,
}: {
  value: QueueScope
  onChange: (scope: QueueScope) => void
}) {
  const { t } = useTranslation()
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(value, 'x')

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={t('ops:scope.label')}
      className="relative mb-4 inline-flex gap-1 rounded-control border border-border bg-surface-2 p-1"
    >
      <SlidingIndicator box={box} axis="x" className="my-1" />
      {SCOPES.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          data-indicator-item
          onClick={() => onChange(id)}
          className={cn(
            'relative z-10 h-8 rounded-control px-3 text-copy transition-colors duration-base ease-out',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            value === id
              ? 'font-medium text-accent-surface-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
