import { Columns3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_COLUMN_KEY,
  CATALOG_COLUMNS,
  CATALOG_LOCKED_COLUMN,
  DEFAULT_CATALOG_COLUMNS,
} from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { PanelHead, PanelTitle } from '@/shared/ui/overlays/panel-head'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

export function CatalogColumnsMenu<T extends string>({
  columns,
  onToggle,
  onReset,
  all = CATALOG_COLUMNS as unknown as readonly T[],
  labels = CATALOG_COLUMN_KEY as unknown as Record<T, string>,
  locked = CATALOG_LOCKED_COLUMN as unknown as T,
  defaults = DEFAULT_CATALOG_COLUMNS as unknown as readonly T[],
  namespace = 'event',
}: {
  columns: T[]
  onToggle: (column: T) => void
  onReset: () => void
  all?: readonly T[]
  labels?: Record<T, string>
  locked?: T
  defaults?: readonly T[]
  namespace?: string
}) {
  const { t } = useTranslation('event')
  const { t: tLabel } = useTranslation(namespace)
  const title = t('catalog.columns.action')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={title}
          title={title}
          data-columns-trigger=""
          className="size-9 shrink-0 p-0"
        >
          <Columns3 className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        collisionPadding={12}
        aria-label={title}
        data-columns-panel=""
        className="w-60 p-0"
      >
        <PanelHead
          title={<PanelTitle>{title}</PanelTitle>}
          resetLabel={t('catalog.columns.reset')}
          onReset={sameSet(columns, defaults) ? undefined : onReset}
        />
        <div className="flex flex-col gap-0.5 p-1.5">
          {all.map((column) => {
            const isLocked = column === locked
            return (
              <div
                key={column}
                className={cn(
                  'flex items-center gap-2 rounded-control px-1.5 py-1.5 text-copy',
                  isLocked ? 'text-muted-foreground' : 'hover:bg-surface-2',
                )}
              >
                <Checkbox
                  id={`catalog-column-${column}`}
                  checked={columns.includes(column)}
                  disabled={isLocked}
                  onCheckedChange={() => onToggle(column)}
                />
                <Label
                  htmlFor={`catalog-column-${column}`}
                  className={cn('flex-1', isLocked ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  {tLabel(labels[column])}
                </Label>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
