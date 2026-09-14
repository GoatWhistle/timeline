import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { REMINDER_OCCASIONS } from '@/entities/notification/notification.labels'
import {
  useReminderSchedule,
  useUpdateReminderSchedule,
} from '@/entities/notification/reminder-schedule.queries'
import type { ReminderScheduleResponse } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Switch } from '@/shared/ui/forms/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { QueryBoundary, SkeletonDetail } from '@/shared/ui/states'
import { ReminderDayRow } from './reminder-day-row'
import { daysOf, toggleDay, withOccasions } from './reminder-schedule.model'

function ScheduleForm({ schedule }: { schedule: ReminderScheduleResponse }) {
  const { t } = useTranslation('notification')
  const update = useUpdateReminderSchedule()

  function save(body: Parameters<typeof update.mutate>[0]) {
    update.mutate(body, {
      onSuccess: () => toast.success(t('reminder.updated')),
      onError: () => toast.error(t('reminder.failed')),
    })
  }

  const nothingChosen =
    !schedule.overdue_enabled &&
    REMINDER_OCCASIONS.every((occasion) => daysOf(schedule, occasion).length === 0)

  return (
    <CardContent className="flex flex-col gap-4">
      <dl className="divide-y divide-border">
        {REMINDER_OCCASIONS.map((occasion) => (
          <ReminderDayRow
            key={occasion}
            occasion={occasion}
            dayChoices={schedule.day_choices}
            selected={daysOf(schedule, occasion)}
            disabled={update.isPending}
            onToggleDay={(day, checked) =>
              save({
                occasions: toggleDay(schedule, occasion, day, checked),
                overdue_enabled: schedule.overdue_enabled,
              })
            }
          />
        ))}
      </dl>

      <div className="flex items-start justify-between gap-3 border-border border-t pt-4">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-copy">{t('reminder.overdueTitle')}</p>
          <p className="max-w-prose text-meta text-muted-foreground">{t('reminder.overdueHint')}</p>
        </div>
        <Switch
          id="reminder-overdue"
          checked={schedule.overdue_enabled}
          aria-label={t('reminder.overdueTitle')}
          disabled={update.isPending}
          onCheckedChange={(checked) =>
            save({
              occasions: withOccasions(schedule),
              overdue_enabled: checked === true,
            })
          }
        />
      </div>

      {nothingChosen && (
        <Note tone="warning" title={t('reminder.emptyTitle')}>
          {t('reminder.emptyHint')}
        </Note>
      )}
    </CardContent>
  )
}

export function ReminderScheduleCard() {
  const { t } = useTranslation('notification')
  const query = useReminderSchedule()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reminder.title')}</CardTitle>
        <CardDescription>{t('reminder.hint')}</CardDescription>
      </CardHeader>
      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={
          <CardContent>
            <SkeletonDetail />
          </CardContent>
        }
      >
        {query.data && <ScheduleForm schedule={query.data} />}
      </QueryBoundary>
    </Card>
  )
}
