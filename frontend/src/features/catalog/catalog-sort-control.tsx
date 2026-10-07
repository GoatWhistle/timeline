import { ArrowUpDown, Check, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_ORDERS,
  CATALOG_SORTS,
  type CatalogOrder,
  type CatalogSort,
  DEFAULT_CATALOG_ORDER,
  DEFAULT_CATALOG_SORT,
} from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { SortArrow } from '@/shared/ui/data-display/sort-icon'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import { PanelHead, PanelTitle } from '@/shared/ui/overlays/panel-head'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

const CHOICE = cn(
  'relative z-10 flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-copy',
  'transition-colors duration-instant ease-out',
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
)

function SortFields({ sort, onSort }: { sort: CatalogSort; onSort: (value: CatalogSort) => void }) {
  const { t } = useTranslation('event')
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(sort, 'y')

  return (
    <div ref={containerRef} className="relative flex flex-col gap-0.5 p-1.5">
      <SlidingIndicator box={box} axis="y" />
      {CATALOG_SORTS.map((value) => {
        const chosen = value === sort
        return (
          <button
            key={value}
            type="button"
            aria-pressed={chosen}
            data-indicator-item
            data-indicator-active={chosen ? 'true' : undefined}
            onClick={() => onSort(value)}
            className={cn(
              CHOICE,
              chosen
                ? 'text-accent-surface-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{t(`catalog.sort.${value}`)}</span>
            <Check
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0',
                'motion-safe:transition-[opacity,scale] motion-safe:duration-fast motion-safe:ease-out',
                chosen ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

function SortDirection({
  order,
  onOrder,
}: {
  order: CatalogOrder
  onOrder: (value: CatalogOrder) => void
}) {
  const { t } = useTranslation('event')
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(order, 'y')

  return (
    <fieldset className="border-border border-t p-1.5">
      <legend className="sr-only">{t('catalog.orderAria')}</legend>
      <div ref={containerRef} data-sort-direction="" className="relative flex flex-col gap-0.5">
        <SlidingIndicator box={box} axis="y" />
        {CATALOG_ORDERS.map((value) => {
          const chosen = value === order
          return (
            <button
              key={value}
              type="button"
              aria-pressed={chosen}
              data-indicator-item
              data-indicator-active={chosen ? 'true' : undefined}
              onClick={() => onOrder(value)}
              className={cn(
                CHOICE,
                chosen
                  ? 'text-accent-surface-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <SortArrow order={value} className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t(`catalog.order.${value}`)}</span>
              <Check
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0',
                  'motion-safe:transition-[opacity,scale] motion-safe:duration-fast motion-safe:ease-out',
                  chosen ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                )}
              />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function CatalogSortControl({
  sort,
  order,
  onSort,
  onOrder,
  onReset,
}: {
  sort: CatalogSort
  order: CatalogOrder
  onSort: (value: CatalogSort) => void
  onOrder: (value: CatalogOrder) => void
  onReset: () => void
}) {
  const { t } = useTranslation('event')
  const title = t('catalog.sortPanel.title')
  const label = t('catalog.sortPanel.trigger', {
    field: t(`catalog.sort.${sort}`),
    order: t(`catalog.order.${order}`),
  })
  const changed = sort !== DEFAULT_CATALOG_SORT || order !== DEFAULT_CATALOG_ORDER

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={label}
          title={label}
          data-sort-trigger=""
          className="size-9 shrink-0 p-0"
        >
          <ArrowUpDown className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        collisionPadding={12}
        aria-label={title}
        data-sort-panel=""
        className="w-60 p-0"
      >
        <PanelHead
          title={<PanelTitle>{title}</PanelTitle>}
          resetLabel={t('catalog.sortPanel.reset')}
          onReset={changed ? onReset : undefined}
        />
        <SortFields sort={sort} onSort={onSort} />
        <SortDirection order={order} onOrder={onOrder} />
      </PopoverContent>
    </Popover>
  )
}

export function CatalogExportButton({
  pending,
  onExport,
}: {
  pending: boolean
  onExport: () => void
}) {
  const { t } = useTranslation('event')
  const label = t('catalog.export.action')

  return (
    <Button
      variant="outline"
      aria-label={label}
      title={label}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={onExport}
      data-export-trigger=""
      className="size-9 shrink-0 p-0"
    >
      {pending ? (
        <Spinner label={t('catalog.export.pending')} />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
    </Button>
  )
}
