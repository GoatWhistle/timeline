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

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
      data-reminder-occasion={occasion}
    >
      <span className="text-meta text-muted-foreground">{t('explainer.daysLegend')}</span>
      {dayChoices.map((day) => (
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
          {t('reminder.day', { count: day })}
        </ReminderChip>
      ))}
      {selected.length === 0 ? (
        <span className="text-meta text-muted-foreground">{t('explainer.daysNever')}</span>
      ) : null}
    </div>
  )
}
