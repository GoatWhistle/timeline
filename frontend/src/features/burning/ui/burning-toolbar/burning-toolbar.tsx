import { useTranslation } from 'react-i18next'
import type { BurningFilters, BurningSort } from '@/features/burning/model/burning'
import { Checkbox } from '@/shared/ui/forms/checkbox'
import { Label } from '@/shared/ui/forms/label'
import { Button } from '@/shared/ui/primitives/button'

const SORTS: BurningSort[] = ['urgency', 'start']

const SORT_KEY: Record<BurningSort, string> = {
  urgency: 'burning.sortUrgency',
  start: 'burning.sortStart',
}

export function BurningToolbar({
  filters,
  onSort,
  onActiveOnly,
  onNeedsAction,
}: {
  filters: BurningFilters
  onSort: (sort: BurningSort) => void
  onActiveOnly: (value: boolean) => void
  onNeedsAction: (value: boolean) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="flex flex-wrap items-center gap-3 border-border border-b px-4 py-2">
      <fieldset className="flex gap-1">
        <legend className="sr-only">{t('burning.sortLegend')}</legend>
        {SORTS.map((sort) => (
          <Button
            key={sort}
            size="sm"
            variant={filters.sort === sort ? 'default' : 'outline'}
            aria-pressed={filters.sort === sort}
            data-sort={sort}
            onClick={() => onSort(sort)}
          >
            {t(SORT_KEY[sort])}
          </Button>
        ))}
      </fieldset>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="burning-active-only"
            checked={filters.activeOnly}
            onCheckedChange={(checked) => onActiveOnly(checked === true)}
          />
          <Label htmlFor="burning-active-only" className="text-meta">
            {t('burning.activeOnly')}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="burning-needs-action"
            checked={filters.needsAction}
            onCheckedChange={(checked) => onNeedsAction(checked === true)}
          />
          <Label htmlFor="burning-needs-action" className="text-meta">
            {t('burning.needsAction')}
          </Label>
        </div>
      </div>
    </div>
  )
}
