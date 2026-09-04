import { LayoutGrid, Table2 } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { CATALOG_LAYOUTS, type CatalogLayout } from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'

const LAYOUT_ICON: Record<CatalogLayout, React.ComponentType<{ className?: string }>> = {
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

  return (
    <fieldset className="flex h-9 items-center gap-0.5 rounded-control border border-border p-0.5 pointer-coarse:h-12">
      <legend className="sr-only">{t('catalog.layoutAria')}</legend>
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
            onClick={() => onLayout(value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-control pointer-coarse:size-11',
              'transition-colors duration-instant ease-out',
              'focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring',
              active
                ? 'bg-accent-surface text-accent-surface-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        )
      })}
    </fieldset>
  )
}
