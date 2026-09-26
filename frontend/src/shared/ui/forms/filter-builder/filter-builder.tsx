import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { FilterChoice, type FilterOption } from './filter-choice'
import { FilterBody, FilterHead, type FilterSurfaceProps } from './filter-parts'
import { FilterSheet } from './filter-sheet'
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
      className={cn(
        'grid grid-cols-[3.5rem_minmax(0,1fr)_2rem] items-start gap-2',
        '@xl:grid-cols-[8.5rem_3.5rem_minmax(0,1fr)_2rem]',
      )}
    >
      <div className="col-span-2 @xl:col-span-1">
        <FilterChoice
          value={field}
          choices={fields}
          label={t('filters.fieldAria')}
          onChange={onField}
        />
      </div>
      <span
        data-filter-operator=""
        className={cn(
          'col-start-1 row-start-2 flex h-9 items-center justify-center text-center',
          'text-meta text-muted-foreground',
          '@xl:col-start-2 @xl:row-start-1',
        )}
      >
        {operator}
      </span>
      <div
        className={cn(
          'col-span-2 col-start-2 row-start-2 min-w-0',
          '@xl:col-span-1 @xl:col-start-3 @xl:row-start-1',
        )}
      >
        {children}
      </div>
      <span
        className={cn(
          'col-start-3 row-start-1 flex h-9 items-center justify-end',
          '@xl:col-start-4',
        )}
      >
        <CloseButton label={t('filters.remove')} onClick={onRemove} />
      </span>
    </div>
  )
}

export function FilterPopover(props: FilterSurfaceProps) {
  const { t } = useTranslation()
  const phone = usePhoneViewport()
  const { count, available, onAdd, onReset, onOpenChange, children } = props

  if (phone) return <FilterSheet {...props} />

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FilterTrigger count={count} />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        collisionPadding={12}
        aria-label={t('filters.title')}
        data-filter-panel=""
        className={cn(
          'flex w-[38rem] max-w-[calc(100vw-1.5rem)] flex-col p-0',
          'max-h-(--radix-popover-content-available-height)',
        )}
      >
        <FilterHead
          count={count}
          onReset={onReset}
          title={
            <span className="font-medium text-caption text-muted-foreground">
              {t('filters.title')}
            </span>
          }
        />
        <div className="min-h-0 overflow-y-auto">
          <FilterBody available={available} onAdd={onAdd}>
            {children}
          </FilterBody>
        </div>
      </PopoverContent>
    </Popover>
  )
}
