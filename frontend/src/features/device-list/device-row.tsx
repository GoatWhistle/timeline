import { CircleDot, Laptop, Smartphone, Tablet } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { type DeviceKind, describeDevice } from '@/entities/session/device-label'
import type { SessionResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

const KIND_ICON: Record<DeviceKind, ComponentType<{ className?: string }>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Laptop,
  unknown: CircleDot,
}

export function DeviceRow({
  session,
  pending,
  onRevoke,
}: {
  session: SessionResponse
  pending: boolean
  onRevoke: () => void
}) {
  const { t } = useTranslation()
  const device = describeDevice(session.user_agent)
  const Icon = KIND_ICON[device.kind]

  const name = [device.browser, device.platform].filter(Boolean).join(' · ')
  const title = name || t(`devices.kind_${device.kind}`)
  const current = session.current === true

  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-copy">{title}</p>
          {current ? (
            <Badge tone="primary">
              <CircleDot className="size-3 shrink-0" aria-hidden="true" />
              {t('devices.current')}
            </Badge>
          ) : null}
        </div>

        {session.last_used_at ? (
          <p className="mt-0.5 text-meta text-muted-foreground">
            {t('devices.lastUsed', { when: formatRelative(session.last_used_at) })}
          </p>
        ) : null}
        <p className="mt-0.5 text-meta text-muted-foreground">
          {t('devices.createdAt', { when: formatDateTime(session.created_at) })}
          {session.ip ? ` · ${t('devices.address', { ip: session.ip })}` : ''}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={pending}
        aria-label={t('devices.revokeAria', { device: title })}
        onClick={onRevoke}
      >
        {t('devices.revoke')}
      </Button>
    </li>
  )
}
