import { LayoutGrid, type LucideIcon, Table2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CATALOG_LAYOUTS, type CatalogLayout } from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

const LAYOUT_ICON: Record<CatalogLayout, LucideIcon> = {
  table: Table2,
  grid: LayoutGrid,
}

export function CatalogViewSwitch({
  layout,
  onLayout,
}: {
  layout: CatalogLayout
  onLayout: (value: CatalogLayout) => void
}) {
  const { t } = useTranslation('event')
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(layout, 'x')

  return (
    <fieldset className="flex h-9 items-center rounded-control border border-border p-0.5 pointer-coarse:h-12">
      <legend className="sr-only">{t('catalog.layoutAria')}</legend>
      <div ref={containerRef} data-view-switch="" className="relative flex items-center gap-0.5">
        <SlidingIndicator box={box} axis="x" />
        {CATALOG_LAYOUTS.map((value) => {
          const Icon = LAYOUT_ICON[value]
          const active = value === layout
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              aria-label={t(`catalog.layout.${value}`)}
              title={t(`catalog.layout.${value}`)}
              data-indicator-item
              data-indicator-active={active ? 'true' : undefined}
              onClick={() => onLayout(value)}
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-control pointer-coarse:size-11',
                'transition-colors duration-instant ease-out',
                'focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring',
                active
                  ? 'text-accent-surface-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  'size-4',
                  'motion-safe:transition-[scale,rotate] motion-safe:duration-base motion-safe:ease-out',
                  active ? 'scale-100 rotate-0' : 'scale-85 -rotate-12',
                )}
              />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
