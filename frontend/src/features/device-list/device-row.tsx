import { CircleDot, Laptop, Pencil, Smartphone, Tablet, Trash2 } from 'lucide-react'
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
  onRename,
  onRevoke,
}: {
  session: SessionResponse
  pending: boolean
  onRename: () => void
  onRevoke: () => void
}) {
  const { t } = useTranslation()
  const device = describeDevice(session.user_agent)
  const Icon = KIND_ICON[device.kind]

  const hardware = [device.browser, device.platform].filter(Boolean).join(', ')
  const fallback = hardware || t(`devices.kind_${device.kind}`)
  const label = session.label ?? ''
  const title = label || fallback
  const current = session.current === true

  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-copy">{title}</p>
          {current ? (
            <Badge tone="primary">
              <CircleDot className="size-3 shrink-0" aria-hidden="true" />
              {t('devices.current')}
            </Badge>
          ) : null}
        </div>

        {label ? (
          <p className="mt-0.5 truncate text-meta text-muted-foreground">{fallback}</p>
        ) : null}

        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-meta text-muted-foreground">
          {session.last_used_at ? (
            <>
              <dt className="text-muted-foreground/70">{t('devices.lastUsedTerm')}</dt>
              <dd className="truncate">{formatRelative(session.last_used_at)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground/70">{t('devices.signedInTerm')}</dt>
          <dd className="truncate">{formatDateTime(session.created_at)}</dd>
          {session.ip ? (
            <>
              <dt className="text-muted-foreground/70">{t('devices.ipTerm')}</dt>
              <dd className="truncate font-mono">{session.ip}</dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={onRename}
          aria-label={t('devices.renameAria', { device: title })}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={onRevoke}
          aria-label={t('devices.revokeAria', { device: title })}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
