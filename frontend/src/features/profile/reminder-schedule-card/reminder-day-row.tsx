import { useTranslation } from 'react-i18next'
import type { ReminderOccasion } from '@/entities/notification/notification.labels'
import { Checkbox } from '@/shared/ui/forms/checkbox'

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
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium text-copy" data-reminder-occasion={occasion}>
          {t(`explainer.type.${occasion}.name`)}
        </p>
        <p className="text-meta text-muted-foreground">
          {selected.length === 0
            ? t('reminder.never')
            : t('reminder.selected', { count: selected.length, days: selected.join(', ') })}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {dayChoices.map((day) => {
          const id = `reminder-${occasion}-${day}`
          return (
            <div key={day} className="flex items-center gap-2 text-meta">
              <Checkbox
                id={id}
                checked={selected.includes(day)}
                disabled={disabled}
                aria-label={t('reminder.dayLabel', {
                  occasion: t(`explainer.type.${occasion}.name`),
                  count: day,
                })}
                onCheckedChange={(checked) => onToggleDay(day, checked === true)}
              />
              <label htmlFor={id} className="text-muted-foreground">
                {t('reminder.day', { count: day })}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
