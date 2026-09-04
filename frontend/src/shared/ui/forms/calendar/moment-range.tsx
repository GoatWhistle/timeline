import { useTranslation } from 'react-i18next'
import { type Civil, compareCivil, isCivil, isCivilDate } from '@/shared/datetime/civil'
import type { RangeHighlight } from './calendar-grid'
import { MomentField } from './moment-field'

export type MomentRange = { start: Civil; end: Civil }

export type RangeProblem = { start?: string; end?: string }

function momentProblem(moment: Civil, blank: string): string | null {
  if (moment.date === '' || moment.time === '') return blank
  if (!isCivil(moment)) return 'errors:field.invalid_format'
  return null
}

export function rangeProblem(range: MomentRange): RangeProblem | null {
  const start = momentProblem(range.start, 'event:form.startRequired')
  const end = momentProblem(range.end, 'event:form.endRequired')
  if (start !== null && end !== null) return { start, end }
  if (start !== null) return { start }
  if (end !== null) return { end }
  if (endBeforeStart(range)) return { end: 'event:form.endAfterStart' }
  return null
}

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
        required
        {...(isCivilDate(value.end.date) ? { bounds: { max: value.end.date } } : {})}
        error={startError}
        onChange={(start) => onChange({ ...value, start })}
      />
      <MomentField
        id={`${idPrefix}-end`}
        label={t('form.end')}
        value={value.end}
        range={highlight}
        required
        {...(isCivilDate(value.start.date) ? { bounds: { min: value.start.date } } : {})}
        error={endError}
        onChange={(end) => onChange({ ...value, end })}
      />
    </div>
  )
}
