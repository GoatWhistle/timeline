import { useTranslation } from 'react-i18next'
import {
  USER_FILTER_CHOICES,
  USER_FILTER_FIELD_KEY,
  USER_FILTER_FIELDS,
  type UserFilterField,
} from '@/entities/user/user.views'
import {
  FilterChoice,
  FilterCondition,
  FilterPopover,
} from '@/shared/ui/forms/filter-builder/filter-builder'
import { useFilterRows } from '@/shared/ui/forms/filter-builder/use-filter-rows'

export type UserFilterValues = Partial<Record<UserFilterField, string>>

export function UserFiltersPopover({
  values,
  onChange,
  onReset,
}: {
  values: UserFilterValues
  onChange: (patch: UserFilterValues) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const active = (field: UserFilterField) => (values[field] ?? '') !== ''
  const rows = useFilterRows(USER_FILTER_FIELDS, active)
  const optionsOf = (list: readonly UserFilterField[]) =>
    list.map((field) => ({ value: field, label: t(USER_FILTER_FIELD_KEY[field]) }))

  return (
    <FilterPopover
      count={USER_FILTER_FIELDS.filter(active).length}
      available={optionsOf(rows.available)}
      onAdd={(field) => rows.add(field as UserFilterField)}
      onReset={() => {
        rows.settle()
        onReset()
      }}
      onOpenChange={(open) => (open ? rows.begin() : rows.settle())}
    >
      {rows.rows.map((field) => (
        <FilterCondition
          key={field}
          field={field}
          fields={optionsOf([field, ...rows.available])}
          operator={t('filters.is')}
          onField={(to) => {
            if (to === field) return
            rows.swap(field, to as UserFilterField)
            onChange({ [field]: '' })
          }}
          onRemove={() => {
            rows.remove(field)
            onChange({ [field]: '' })
          }}
        >
          <FilterChoice
            value={values[field] ?? ''}
            label={t('filters.valueAria')}
            placeholder={t('filters.choose')}
            autoOpen={rows.fresh === field}
            choices={USER_FILTER_CHOICES[field].map((choice) => ({
              value: choice.value,
              label: t(choice.labelKey),
            }))}
            onChange={(value) => onChange({ [field]: value })}
          />
        </FilterCondition>
      ))}
    </FilterPopover>
  )
}
