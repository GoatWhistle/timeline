import { Columns3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_COLUMN_KEY,
  CATALOG_COLUMNS,
  CATALOG_LOCKED_COLUMN,
} from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

export function CatalogColumnsMenu<T extends string>({
  columns,
  onToggle,
  onReset,
  all = CATALOG_COLUMNS as unknown as readonly T[],
  labels = CATALOG_COLUMN_KEY as unknown as Record<T, string>,
  locked = CATALOG_LOCKED_COLUMN as unknown as T,
  namespace = 'event',
}: {
  columns: T[]
  onToggle: (column: T) => void
  onReset: () => void
  all?: readonly T[]
  labels?: Record<T, string>
  locked?: T
  namespace?: string
}) {
  const { t } = useTranslation('event')
  const { t: tLabel } = useTranslation(namespace)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Columns3 className="size-4" aria-hidden="true" />
          {t('catalog.columns.action')}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56">
        <div className="flex flex-col gap-0.5">
          {all.map((column) => {
            const isLocked = column === locked
            const checked = columns.includes(column)
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
                  checked={checked}
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

          <div className="mt-1 border-border border-t pt-1">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onReset}>
              {t('catalog.columns.reset')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
