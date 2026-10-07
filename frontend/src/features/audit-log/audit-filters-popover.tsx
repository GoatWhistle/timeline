import { useTranslation } from 'react-i18next'
import {
  AUDIT_ACTIONS,
  auditActionKey,
  ENTITY_TYPES,
  entityTypeKey,
} from '@/entities/audit/audit.labels'
import {
  FilterChoice,
  FilterCondition,
  FilterPopover,
} from '@/shared/ui/forms/filter-builder/filter-builder'
import { FilterDateRange } from '@/shared/ui/forms/filter-builder/filter-date-range'
import { useFilterRows } from '@/shared/ui/forms/filter-builder/use-filter-rows'
import type { AuditFilterState } from './audit.params'

const AUDIT_ROWS = ['action', 'entity', 'period'] as const
type AuditRow = (typeof AUDIT_ROWS)[number]

const ROW_LABEL: Record<AuditRow, string> = {
  action: 'audit.action',
  entity: 'audit.entity',
  period: 'audit.period',
}

type AuditFilterPatch = Partial<Pick<AuditFilterState, 'action' | 'entity' | 'from' | 'to'>>

function cleared(row: AuditRow): AuditFilterPatch {
  return row === 'period' ? { from: '', to: '' } : { [row]: '' }
}

function active(values: AuditFilterState, row: AuditRow): boolean {
  return row === 'period' ? values.from !== '' || values.to !== '' : values[row] !== ''
}

export function AuditFiltersPopover({
  values,
  onChange,
  onReset,
}: {
  values: AuditFilterState
  onChange: (patch: AuditFilterPatch) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const rows = useFilterRows(AUDIT_ROWS, (row) => active(values, row))
  const optionsOf = (list: readonly AuditRow[]) =>
    list.map((row) => ({ value: row, label: t(ROW_LABEL[row]) }))

  return (
    <FilterPopover
      count={AUDIT_ROWS.filter((row) => active(values, row)).length}
      available={optionsOf(rows.available)}
      onAdd={(row) => rows.add(row as AuditRow)}
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
          operator={row === 'period' ? t('event:catalog.operator.between') : t('filters.is')}
          onField={(to) => {
            if (to === row) return
            rows.swap(row, to as AuditRow)
            onChange(cleared(row))
          }}
          onRemove={() => {
            rows.remove(row)
            onChange(cleared(row))
          }}
        >
          {row === 'period' ? (
            <FilterDateRange
              id="audit-condition-period"
              from={values.from}
              to={values.to}
              autoFocus={rows.fresh === row}
              onChange={(range) => onChange(range)}
            />
          ) : (
            <FilterChoice
              value={values[row]}
              label={t('filters.valueAria')}
              placeholder={t('filters.choose')}
              autoOpen={rows.fresh === row}
              choices={
                row === 'action'
                  ? AUDIT_ACTIONS.map((action) => ({
                      value: action,
                      label: t(auditActionKey(action)),
                    }))
                  : ENTITY_TYPES.map((entity) => ({
                      value: entity,
                      label: t(entityTypeKey(entity)),
                    }))
              }
              onChange={(value) => onChange({ [row]: value })}
            />
          )}
        </FilterCondition>
      ))}
    </FilterPopover>
  )
}
