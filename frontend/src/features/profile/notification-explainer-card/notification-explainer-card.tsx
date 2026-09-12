import { useTranslation } from 'react-i18next'
import type { NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { NotificationOccasionRow } from './notification-occasion-row'

const EXPLAINED_TYPES: NotificationOccasion[] = [
  'REGISTRATION_REQUIRED',
  'REGISTRATION_REMINDER',
  'REGISTRATION_OVERDUE',
  'WEEKLY_DIGEST',
  'PERSONAL_TASK_DUE',
  'PERSONAL_RETROSPECTIVE_DUE',
]

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

        <Note title={t('explainer.stopTitle')}>{t('explainer.stopHint')}</Note>

        <p className="max-w-prose text-caption text-muted-foreground">
          {t('explainer.timingNote')}
        </p>
      </CardContent>
    </Card>
  )
}
