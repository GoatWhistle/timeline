import { useTranslation } from 'react-i18next'
import {
  FilterChoice,
  FilterCondition,
  FilterPopover,
} from '@/shared/ui/forms/filter-builder/filter-builder'
import { FilterDateRange } from '@/shared/ui/forms/filter-builder/filter-date-range'
import { useFilterRows } from '@/shared/ui/forms/filter-builder/use-filter-rows'
import {
  CATALOG_FILTER_FIELD_KEY,
  CATALOG_FILTER_FIELDS,
  CATALOG_FILTER_OPERATOR_KEY,
  type CatalogFilterField,
  type CatalogFilterValues,
  type CatalogRowField,
  clearedRow,
  filterChoices,
  PERIOD_FIELD_KEY,
  PERIOD_OPERATOR_KEY,
  rowActive,
  rowFieldsOf,
} from './catalog-filter-conditions'

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
  const { t: tCommon } = useTranslation()
  const all = rowFieldsOf(fields)
  const rows = useFilterRows(all, (row) => rowActive(values, row))

  const labelOf = (row: CatalogRowField) =>
    t(row === 'period' ? PERIOD_FIELD_KEY : CATALOG_FILTER_FIELD_KEY[row])
  const optionsOf = (list: readonly CatalogRowField[]) =>
    list.map((row) => ({ value: row, label: labelOf(row) }))

  return (
    <FilterPopover
      count={all.filter((row) => rowActive(values, row)).length}
      available={optionsOf(rows.available)}
      onAdd={(row) => rows.add(row as CatalogRowField)}
      onReset={() => {
        rows.settle()
        onReset()
      }}
      onOpenChange={(open) => (open ? rows.begin() : rows.settle())}
    >
      {rows.rows.map((row) => (
        <FilterCondition
          key={row}
          field={row}
          fields={optionsOf([row, ...rows.available])}
          operator={t(row === 'period' ? PERIOD_OPERATOR_KEY : CATALOG_FILTER_OPERATOR_KEY[row])}
          onField={(to) => {
            if (to === row) return
            rows.swap(row, to as CatalogRowField)
            onChange(clearedRow(row))
          }}
          onRemove={() => {
            rows.remove(row)
            onChange(clearedRow(row))
          }}
        >
          {row === 'period' ? (
            <FilterDateRange
              id="catalog-condition-period"
              from={values.from ?? ''}
              to={values.to ?? ''}
              autoFocus={rows.fresh === row}
              onChange={(range) => onChange(range)}
            />
          ) : (
            <FilterChoice
              value={values[row] ?? ''}
              label={tCommon('filters.valueAria')}
              placeholder={tCommon('filters.choose')}
              autoOpen={rows.fresh === row}
              choices={filterChoices(row, admin).map((choice) => ({
                value: choice.value,
                label: t(choice.labelKey),
              }))}
              onChange={(value) => onChange({ [row]: value })}
            />
          )}
        </FilterCondition>
      ))}
    </FilterPopover>
  )
}
