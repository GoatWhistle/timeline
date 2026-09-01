import { Columns3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATALOG_COLUMN_KEY,
  CATALOG_COLUMNS,
  CATALOG_LOCKED_COLUMN,
  type CatalogColumn,
} from '@/entities/catalog/catalog.views'
import { cn } from '@/shared/styling/class-names/class-names'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

export function CatalogColumnsMenu({
  columns,
  onToggle,
  onReset,
}: {
  columns: CatalogColumn[]
  onToggle: (column: CatalogColumn) => void
  onReset: () => void
}) {
  const { t } = useTranslation('event')

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
          {CATALOG_COLUMNS.map((column) => {
            const locked = column === CATALOG_LOCKED_COLUMN
            const checked = columns.includes(column)
            return (
              <div
                key={column}
                className={cn(
                  'flex items-center gap-2 rounded-control px-1.5 py-1.5 text-copy',
                  locked ? 'text-muted-foreground' : 'hover:bg-surface-2',
                )}
              >
                <Checkbox
                  id={`catalog-column-${column}`}
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={() => onToggle(column)}
                />
                <Label
                  htmlFor={`catalog-column-${column}`}
                  className={cn('flex-1', locked ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  {t(CATALOG_COLUMN_KEY[column])}
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
