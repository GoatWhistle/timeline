import { RotateCcw } from 'lucide-react'
import { Children, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { FilterAddMenu } from './filter-add-menu'
import { FilterChoice, type FilterOption } from './filter-choice'
import { FilterRowList } from './filter-row-list'
import { FilterTrigger } from './filter-trigger'

export { FilterChoice, type FilterOption }

export function FilterCondition({
  field,
  fields,
  operator,
  onField,
  onRemove,
  children,
}: {
  field: string
  fields: readonly FilterOption[]
  operator: string
  onField: (to: string) => void
  onRemove: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div
      data-filter-condition={field}
      className="grid grid-cols-[9rem_4rem_minmax(0,1fr)_2rem] items-start gap-2"
    >
      <FilterChoice
        value={field}
        choices={fields}
        label={t('filters.fieldAria')}
        onChange={onField}
      />
      <span
        data-filter-operator=""
        className="flex h-9 items-center justify-center text-center text-meta text-muted-foreground"
      >
        {operator}
      </span>
      <div className="min-w-0">{children}</div>
      <span className="flex h-9 items-center justify-end">
        <CloseButton label={t('filters.remove')} onClick={onRemove} />
      </span>
    </div>
  )
}

export function FilterPopover({
  count,
  available,
  onAdd,
  onReset,
  onOpenChange,
  children,
}: {
  count: number
  available: readonly FilterOption[]
  onAdd: (field: string) => void
  onReset: () => void
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const empty = Children.count(children) === 0

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FilterTrigger count={count} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        aria-label={t('filters.title')}
        data-filter-panel=""
        className="w-[38rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <header className="flex h-row items-center justify-between gap-2 border-border border-b pr-1.5 pl-3">
          <span className="font-medium text-caption text-muted-foreground">
            {t('filters.title')}
          </span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('filters.reset')}
              title={t('filters.reset')}
              onClick={onReset}
              className="size-8 shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-fast"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>
          )}
        </header>

        <div className="flex flex-col p-3">
          {empty && (
            <p className="pb-3 text-meta text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-base">
              {t('filters.empty')}
            </p>
          )}
          <FilterRowList>{children}</FilterRowList>
          <FilterAddMenu available={available} onAdd={onAdd} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
