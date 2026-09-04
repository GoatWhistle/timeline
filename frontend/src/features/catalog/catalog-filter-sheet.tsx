import { SlidersHorizontal } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
import { TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import {
  activeFilterCount,
  CATALOG_FILTER_FIELD_KEY,
  CATALOG_FILTER_FIELDS,
  type CatalogFilterField,
  type CatalogFilterValues,
  filterChoices,
  isDateField,
} from './catalog-filter-conditions'

function ChoiceGroup({
  field,
  value,
  onValue,
}: {
  field: CatalogFilterField
  value: string
  onValue: (field: CatalogFilterField, value: string) => void
}) {
  const { t } = useTranslation('event')
  const choices = filterChoices(field)

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium text-copy">{t(CATALOG_FILTER_FIELD_KEY[field])}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const active = value === choice.value
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={active}
              onClick={() => onValue(field, active ? '' : choice.value)}
              className={cn(
                'flex items-center justify-center rounded-control border px-4 text-copy',
                TAP_TARGET,
                'motion-safe:transition-colors motion-safe:duration-instant motion-safe:ease-out',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                active
                  ? 'border-ring bg-accent-surface text-accent-surface-foreground'
                  : 'border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground',
              )}
            >
              {t(choice.labelKey)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function DateField({
  field,
  value,
  onValue,
}: {
  field: CatalogFilterField
  value: string
  onValue: (field: CatalogFilterField, value: string) => void
}) {
  const { t } = useTranslation('event')
  const id = `catalog-filter-${field}`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-copy">
        {t(CATALOG_FILTER_FIELD_KEY[field])}
      </label>
      <DatePicker id={id} value={value} onChange={(date) => onValue(field, date)} />
    </div>
  )
}

export function CatalogFilterSheet({
  values,
  onChange,
  onReset,
  open,
  onOpenChange,
  returnFocusTo,
}: {
  values: CatalogFilterValues
  onChange: (patch: Partial<CatalogFilterValues>) => void
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusTo?: React.RefObject<HTMLButtonElement | null>
}) {
  const { t } = useTranslation('event')
  const count = activeFilterCount(values)

  function setValue(field: CatalogFilterField, value: string) {
    onChange({ [field]: value } as Partial<CatalogFilterValues>)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-catalog-filter-sheet=""
        onCloseAutoFocus={(event) => {
          const trigger = returnFocusTo?.current
          if (!trigger) return
          event.preventDefault()
          trigger.focus()
        }}
        className="top-auto bottom-0 max-h-[85vh] max-w-none translate-y-0 rounded-b-none safe-pb"
      >
        <DialogHeader>
          <DialogTitle>{t('catalog.filters.action')}</DialogTitle>
          <DialogDescription>{t('catalog.filters.sheetHint')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto">
          {CATALOG_FILTER_FIELDS.map((field) =>
            isDateField(field) ? (
              <DateField key={field} field={field} value={values[field]} onValue={setValue} />
            ) : (
              <ChoiceGroup key={field} field={field} value={values[field]} onValue={setValue} />
            ),
          )}
        </div>

        <div className="flex items-center gap-2 border-border border-t pt-4">
          <Button
            variant="outline"
            disabled={count === 0}
            onClick={onReset}
            className={cn('flex-1', TAP_TARGET)}
          >
            {t('catalog.filters.reset')}
          </Button>
          <Button onClick={() => onOpenChange(false)} className={cn('flex-1', TAP_TARGET)}>
            {t('catalog.filters.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CatalogFilterSheetTrigger({
  values,
  onClick,
  ref,
}: {
  values: CatalogFilterValues
  onClick: () => void
  ref?: React.Ref<HTMLButtonElement>
}) {
  const { t } = useTranslation('event')
  const count = activeFilterCount(values)

  return (
    <Button ref={ref} variant="outline" onClick={onClick} className={cn('gap-1.5', TAP_TARGET)}>
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      {t('catalog.filters.action')}
      {count > 0 && (
        <Badge tone="primary" className="ml-0.5">
          {count}
        </Badge>
      )}
    </Button>
  )
}
