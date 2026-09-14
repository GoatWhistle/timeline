import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  NOTIFICATION_TYPE_KEY,
  REMINDER_OCCASIONS,
  type ReminderOccasion,
} from '@/entities/notification/notification.labels'
import {
  useReminderSchedule,
  useUpdateReminderSchedule,
} from '@/entities/notification/reminder-schedule.queries'
import { ReminderChip } from '@/features/profile/reminder-schedule-card/reminder-chip'
import { ReminderDayRow } from '@/features/profile/reminder-schedule-card/reminder-day-row'
import {
  daysOf,
  toggleDay,
  withOccasions,
} from '@/features/profile/reminder-schedule-card/reminder-schedule.model'
import type { Channel, NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { NotificationOccasionRow } from './notification-occasion-row'

const EXPLAINED_TYPES = Object.keys(NOTIFICATION_TYPE_KEY) as NotificationOccasion[]

function isReminder(occasion: NotificationOccasion): occasion is ReminderOccasion {
  return (REMINDER_OCCASIONS as NotificationOccasion[]).includes(occasion)
}

export function NotificationExplainerCard({
  preferences,
  liveChannels,
}: {
  preferences: NotificationPreference[]
  liveChannels: Set<Channel>
}) {
  const { t } = useTranslation('notification')
  const schedule = useReminderSchedule()
  const update = useUpdateReminderSchedule()

  const data = schedule.data

  function save(body: Parameters<typeof update.mutate>[0]) {
    update.mutate(body, {
      onSuccess: () => toast.success(t('reminder.updated')),
      onError: () => toast.error(t('reminder.failed')),
    })
  }

  const allOff = EXPLAINED_TYPES.filter(
    (occasion) =>
      preferences.some((p) => p.occasion === occasion) &&
      preferences.every((p) => p.occasion !== occasion || !p.enabled),
  )

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="divide-y divide-border">
          {EXPLAINED_TYPES.map((occasion) => (
            <NotificationOccasionRow
              key={occasion}
              occasion={occasion}
              preferences={preferences}
              liveChannels={liveChannels}
            >
              {isReminder(occasion) && data ? (
                <ReminderDayRow
                  occasion={occasion}
                  dayChoices={data.day_choices}
                  selected={daysOf(data, occasion)}
                  disabled={update.isPending}
                  onToggleDay={(day, checked) =>
                    save({
                      occasions: toggleDay(data, occasion, day, checked),
                      overdue_enabled: data.overdue_enabled,
                    })
                  }
                />
              ) : null}
              {occasion === 'REGISTRATION_OVERDUE' && data ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-meta text-muted-foreground">
                    {t('reminder.overdueLegend')}
                  </span>
                  <ReminderChip
                    id="reminder-overdue"
                    label={t('reminder.overdueTitle')}
                    checked={data.overdue_enabled}
                    disabled={update.isPending}
                    onChange={(checked) =>
                      save({ occasions: withOccasions(data), overdue_enabled: checked })
                    }
                  >
                    {t('reminder.overdueChip')}
                  </ReminderChip>
                </div>
              ) : null}
            </NotificationOccasionRow>
          ))}
        </div>

        {allOff.map((occasion) => (
          <Note key={occasion} tone="warning" title={t('explainer.allOffTitle')}>
            {t(`explainer.type.${occasion}.name`)} — {t('explainer.allOffHint')}
          </Note>
        ))}
      </CardContent>
    </Card>
  )
}
