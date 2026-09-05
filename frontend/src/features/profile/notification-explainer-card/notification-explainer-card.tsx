import { useTranslation } from 'react-i18next'
import type { NotificationType } from '@/shared/api/types.gen'
import { Note } from '@/shared/ui/data-display/note/note'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'

const EXPLAINED_TYPES: NotificationType[] = [
  'REGISTRATION_REQUIRED',
  'REGISTRATION_REMINDER',
  'REGISTRATION_OVERDUE',
]

export function NotificationExplainerCard() {
  const { t } = useTranslation('notification')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('explainer.title')}</CardTitle>
        <CardDescription>{t('explainer.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="divide-y divide-border">
          {EXPLAINED_TYPES.map((type) => (
            <div key={type} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <dt className="font-medium text-copy" data-explainer-type={type}>
                {t(`explainer.type.${type}.name`)}
              </dt>
              <dd className="max-w-prose text-meta text-muted-foreground">
                {t(`explainer.type.${type}.when`)}
              </dd>
            </div>
          ))}
        </dl>

        <Note title={t('explainer.stopTitle')}>{t('explainer.stopHint')}</Note>

        <p className="max-w-prose text-caption text-muted-foreground">
          {t('explainer.timingNote')}
        </p>
      </CardContent>
    </Card>
  )
}
