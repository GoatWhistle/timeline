import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NotificationType } from '@/shared/api/types.gen'
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

        <p className="flex items-start gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-medium text-copy">{t('explainer.stopTitle')}</span>
            <span className="mt-0.5 block">{t('explainer.stopHint')}</span>
          </span>
        </p>

        <p className="max-w-prose text-caption text-muted-foreground">
          {t('explainer.timingNote')}
        </p>
      </CardContent>
    </Card>
  )
}
