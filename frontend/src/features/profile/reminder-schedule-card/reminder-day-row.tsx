import { useTranslation } from 'react-i18next'
import type { ReminderOccasion } from '@/entities/notification/notification.labels'
import { ReminderChip } from './reminder-chip'

export function ReminderDayRow({
  occasion,
  dayChoices,
  selected,
  disabled,
  onToggleDay,
}: {
  occasion: ReminderOccasion
  dayChoices: number[]
  selected: number[]
  disabled: boolean
  onToggleDay: (day: number, checked: boolean) => void
}) {
  const { t } = useTranslation('notification')
  const head = dayChoices.slice(0, -1)
  const last = dayChoices.at(-1)

  function chipFor(day: number) {
    return (
      <ReminderChip
        key={day}
        id={`reminder-${occasion}-${day}`}
        label={t('reminder.dayLabel', {
          occasion: t(`explainer.type.${occasion}.name`),
          count: day,
        })}
        checked={selected.includes(day)}
        disabled={disabled}
        onChange={(checked) => onToggleDay(day, checked)}
      >
        {day}
      </ReminderChip>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
      data-reminder-occasion={occasion}
    >
      <span className="text-meta text-muted-foreground">{t('explainer.daysLegend')}</span>
      {head.map(chipFor)}
      {last === undefined ? null : (
        <span className="flex items-center gap-2">
          {chipFor(last)}
          <span className="text-meta text-muted-foreground">{t('reminder.daysUnit')}</span>
        </span>
      )}
    </div>
  )
}
