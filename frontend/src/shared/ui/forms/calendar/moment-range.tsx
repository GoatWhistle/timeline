import { useTranslation } from 'react-i18next'
import { type Civil, compareCivil, isCivilDate } from '@/shared/datetime/civil'
import type { RangeHighlight } from './calendar-grid'
import { MomentField } from './moment-field'

export type MomentRange = { start: Civil; end: Civil }

export function rangeHighlight({ start, end }: MomentRange): RangeHighlight {
  if (!isCivilDate(start.date) || !isCivilDate(end.date)) return null
  return { from: start.date, to: end.date }
}

export function endBeforeStart({ start, end }: MomentRange): boolean {
  if (!isCivilDate(start.date) || !isCivilDate(end.date)) return false
  if (!start.time || !end.time) return false
  return compareCivil(end, start) <= 0
}

export function MomentRangeFields({
  idPrefix = 'event',
  value,
  startError,
  endError,
  onChange,
}: {
  idPrefix?: string
  value: MomentRange
  startError?: string | undefined
  endError?: string | undefined
  onChange: (next: MomentRange) => void
}) {
  const { t } = useTranslation('event')
  const highlight = rangeHighlight(value)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MomentField
        id={`${idPrefix}-start`}
        label={t('form.start')}
        value={value.start}
        range={highlight}
        {...(isCivilDate(value.end.date) ? { bounds: { max: value.end.date } } : {})}
        error={startError}
        onChange={(start) => onChange({ ...value, start })}
      />
      <MomentField
        id={`${idPrefix}-end`}
        label={t('form.end')}
        value={value.end}
        range={highlight}
        {...(isCivilDate(value.start.date) ? { bounds: { min: value.start.date } } : {})}
        error={endError}
        hint={t('form.endAfterStartHint')}
        onChange={(end) => onChange({ ...value, end })}
      />
    </div>
  )
}
