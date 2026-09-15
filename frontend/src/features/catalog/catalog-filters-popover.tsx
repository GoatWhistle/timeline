import { Plus, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import {
  activeFields,
  CATALOG_FILTER_FIELD_KEY,
  CATALOG_FILTER_FIELDS,
  CATALOG_FILTER_OPERATOR_KEY,
  type CatalogFilterField,
  type CatalogFilterValues,
  defaultValueFor,
  filterChoices,
  firstUnusedField,
  isDateField,
} from './catalog-filter-conditions'

function ConditionRow({
  field,
  values,
  index,
  fields,
  admin,
  onField,
  onValue,
  onRemove,
}: {
  field: CatalogFilterField
  values: CatalogFilterValues
  index: number
  fields: readonly CatalogFilterField[]
  admin: boolean
  onField: (from: CatalogFilterField, to: CatalogFilterField) => void
  onValue: (field: CatalogFilterField, value: string) => void
  onRemove: (field: CatalogFilterField) => void
}) {
  const { t } = useTranslation('event')
  const used = activeFields(values, fields)
  const available = fields.filter((item) => item === field || !used.includes(item))

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-meta text-muted-foreground">
        {t(index === 0 ? 'catalog.filters.where' : 'catalog.filters.and')}
      </span>

      <Select value={field} onValueChange={(next) => onField(field, next as CatalogFilterField)}>
        <SelectTrigger aria-label={t('catalog.filters.fieldAria')} className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {available.map((item) => (
            <SelectItem key={item} value={item}>
              {t(CATALOG_FILTER_FIELD_KEY[item])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="shrink-0 text-meta text-muted-foreground">
        {t(CATALOG_FILTER_OPERATOR_KEY[field])}
      </span>

      {isDateField(field) ? (
        <div className="w-36">
          <DatePicker
            id={`catalog-condition-${field}`}
            value={values[field] ?? ''}
            onChange={(date) => onValue(field, date)}
          />
        </div>
      ) : (
        <Select value={values[field] ?? ''} onValueChange={(next) => onValue(field, next)}>
          <SelectTrigger aria-label={t('catalog.filters.valueAria')} className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterChoices(field, admin).map((choice) => (
              <SelectItem key={choice.value} value={choice.value}>
                {t(choice.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <CloseButton label={t('catalog.filters.remove')} onClick={() => onRemove(field)} />
    </div>
  )
}

export function CatalogFiltersPopover({
  values,
  onChange,
  onReset,
  fields = CATALOG_FILTER_FIELDS,
  admin = false,
}: {
  values: CatalogFilterValues
  onChange: (patch: Partial<CatalogFilterValues>) => void
  onReset: () => void
  fields?: readonly CatalogFilterField[]
  admin?: boolean
}) {
  const { t } = useTranslation('event')
  const rows = activeFields(values, fields)
  const next = firstUnusedField(values, fields)

  function addCondition() {
    if (next === null) return
    onChange({ [next]: defaultValueFor(next, admin) } as Partial<CatalogFilterValues>)
  }

  function changeField(from: CatalogFilterField, to: CatalogFilterField) {
    if (from === to) return
    onChange({ [from]: '', [to]: defaultValueFor(to, admin) } as Partial<CatalogFilterValues>)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('catalog.filters.action')}
          {rows.length > 0 && (
            <Badge tone="primary" className="ml-0.5">
              {rows.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[30rem] max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="py-1 text-meta text-muted-foreground">{t('catalog.filters.empty')}</p>
          ) : (
            rows.map((field, index) => (
              <ConditionRow
                key={field}
                field={field}
                index={index}
                fields={fields}
                admin={admin}
                values={values}
                onField={changeField}
                onValue={(item, value) =>
                  onChange({ [item]: value } as Partial<CatalogFilterValues>)
                }
                onRemove={(item) => onChange({ [item]: '' } as Partial<CatalogFilterValues>)}
              />
            ))
          )}

          <div className="flex items-center gap-2 border-border border-t pt-2">
            <Button variant="ghost" size="sm" disabled={next === null} onClick={addCondition}>
              <Plus className="size-3.5" aria-hidden="true" />
              {t('catalog.filters.add')}
            </Button>
            {rows.length > 0 && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onReset}>
                {t('catalog.filters.reset')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
