import { useTranslation } from 'react-i18next'
import { NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import type { NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { NotificationOccasionRow } from './notification-occasion-row'

const EXPLAINED_TYPES = Object.keys(NOTIFICATION_TYPE_KEY) as NotificationOccasion[]

export function NotificationExplainerCard({
  preferences,
}: {
  preferences: NotificationPreference[]
}) {
  const { t } = useTranslation('notification')

  const allOff = EXPLAINED_TYPES.filter(
    (occasion) =>
      preferences.some((p) => p.occasion === occasion) &&
      preferences.every((p) => p.occasion !== occasion || !p.enabled),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('explainer.title')}</CardTitle>
        <CardDescription>{t('explainer.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="divide-y divide-border">
          {EXPLAINED_TYPES.map((occasion) => (
            <NotificationOccasionRow key={occasion} occasion={occasion} preferences={preferences} />
          ))}
        </dl>
        {allOff.map((occasion) => (
          <Note key={occasion} tone="warning" title={t('explainer.allOffTitle')}>
            {t('explainer.allOffHint')}
          </Note>
        ))}
      </CardContent>
    </Card>
  )
}
