import { useTranslation } from 'react-i18next'
import { REGISTRATION_STATE_KEY } from '@/entities/registration/registration.labels'
import type { RegistrationResponse } from '@/shared/api/types.gen'
import { Fact, FactList } from '@/shared/ui/data-display/fact-list'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

export function RegistrationFacts({
  registration,
  busy,
  onToggle,
}: {
  registration: RegistrationResponse
  busy: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('registration')
  const active = registration.state === 'ACTIVE'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={active ? 'primary' : 'danger'}>
          {t(REGISTRATION_STATE_KEY[registration.state])}
        </Badge>
        <Button variant="outline" size="sm" disabled={busy} onClick={onToggle}>
          {active ? t('tab.disable') : t('tab.enable')}
        </Button>
      </div>

      <section className="flex flex-col gap-2 border-border border-t pt-4">
        <h3 className="text-caption text-muted-foreground">{t('tab.versionsTitle')}</h3>
        <p className="text-caption text-muted-foreground">{t('tab.versionsHint')}</p>
        <FactList className="mt-1">
          <Fact label={t('tab.scheduleVersion')}>
            <span className="tabular-nums">{registration.schedule_version}</span>
          </Fact>
          <Fact label={t('tab.activationVersion')}>
            <span className="tabular-nums">{registration.activation_version}</span>
          </Fact>
          <Fact label={t('tab.contentVersion')}>
            <span className="tabular-nums">{registration.notification_content_version}</span>
          </Fact>
        </FactList>
      </section>
    </div>
  )
}
