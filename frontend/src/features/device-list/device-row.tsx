import { CircleDot, Laptop, Smartphone, Tablet } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { type DeviceKind, describeDevice } from '@/entities/session/device-label'
import type { SessionResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'
import { DeviceName } from './device-name'

const KIND_ICON: Record<DeviceKind, ComponentType<{ className?: string }>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Laptop,
  unknown: CircleDot,
}

export function DeviceRow({
  session,
  pending,
  renaming,
  onRename,
  onRenameDone,
  onRevoke,
}: {
  session: SessionResponse
  pending: boolean
  renaming: boolean
  onRename: () => void
  onRenameDone: () => void
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
    <li
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-control border bg-card p-3',
        current ? 'border-primary' : 'border-border',
      )}
    >
      <Icon
        className="-right-4 -bottom-5 pointer-events-none absolute size-28 text-muted-foreground/5"
        aria-hidden="true"
      />

      <div className="relative min-w-0 flex-1">
        {renaming ? (
          <DeviceName session={session} title={title} onDone={onRenameDone} />
        ) : (
          <p className="truncate font-medium text-copy">{title}</p>
        )}

        {label || renaming ? (
          <p className="mt-0.5 truncate text-meta text-muted-foreground">{fallback}</p>
        ) : null}

        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-meta text-muted-foreground">
          {session.last_used_at ? (
            <>
              <dt className="text-muted-foreground/70">{t('devices.lastUsedTerm')}</dt>
              <dd className="min-w-0">{formatRelative(session.last_used_at)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground/70">{t('devices.signedInTerm')}</dt>
          <dd className="min-w-0">{formatDateTime(session.created_at)}</dd>
          {session.ip ? (
            <>
              <dt className="text-muted-foreground/70">{t('devices.ipTerm')}</dt>
              <dd className="min-w-0 break-all font-mono">{session.ip}</dd>
            </>
          ) : null}
        </dl>
      </div>

      {renaming ? null : (
        <div className="relative flex shrink-0 items-center gap-1">
          <EditAction
            disabled={pending || renaming}
            onClick={onRename}
            label={t('devices.renameAria', { device: title })}
          />
          <DeleteAction
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            onClick={onRevoke}
            label={t('devices.revokeAria', { device: title })}
          />
        </div>
      )}
    </li>
  )
}
