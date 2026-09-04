import { useTranslation } from 'react-i18next'
import { type Civil, zoneOffsetLabel } from '@/shared/datetime/civil'
import { currentTimeZone } from '@/shared/datetime/datetime'
import { Field } from '@/shared/ui/forms/field'
import type { RangeHighlight } from './calendar-grid'
import { DatePicker } from './date-picker'
import type { DayBounds } from './month-grid'
import { TimeInput } from './time-input'

export function MomentField({
  id,
  label,
  value,
  bounds = {},
  range = null,
  error,
  hint,
  required,
  onChange,
}: {
  id: string
  label: string
  value: Civil
  bounds?: DayBounds
  range?: RangeHighlight
  error?: string | undefined
  hint?: string | undefined
  required?: boolean
  onChange: (next: Civil) => void
}) {
  const { t } = useTranslation('event')
  const zone = currentTimeZone()
  const offset = zoneOffsetLabel(value, zone)

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-36 flex-1">
            <DatePicker
              id={id}
              value={value.date}
              bounds={bounds}
              range={range}
              invalid={Boolean(error)}
              required={required}
              onChange={(date) => onChange({ ...value, date })}
            />
          </div>
          <TimeInput
            id={`${id}-time`}
            value={value.time}
            invalid={Boolean(error)}
            required={required}
            onChange={(time) => onChange({ ...value, time })}
          />
        </div>
        <span className="text-caption text-muted-foreground" data-testid={`${id}-zone`}>
          {t('calendar.zone', { zone, offset })}
        </span>
      </div>
    </Field>
  )
}
