import { CircleDot, Laptop, Smartphone, Tablet } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type BrowserName,
  type DeviceKind,
  describeDevice,
  type PlatformName,
} from '@/entities/session/device-label'
import type { SessionResponse } from '@/shared/api/types.gen'
import { formatDateTime, formatRelative } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { DeviceGlyphMark } from '@/shared/ui/brand/device-glyph/device-glyph'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'
import { DeviceName } from './device-name'

const SCREEN: Record<DeviceKind, string> = {
  mobile: 'inset-x-[20%] top-[12%] bottom-[30%]',
  tablet: 'inset-x-[18%] top-[12%] bottom-[30%]',
  desktop: 'inset-x-[18%] top-[24%] bottom-[36%]',
  unknown: 'inset-0',
}

const KIND_ICON: Record<DeviceKind, ComponentType<{ className?: string }>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Laptop,
  unknown: CircleDot,
}

function MarkRow({
  marks,
  className,
}: {
  marks: (BrowserName | PlatformName)[]
  className?: string
}) {
  if (marks.length === 0) return null

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {marks.map((name) => (
        <DeviceGlyphMark key={name} name={name} className={className} />
      ))}
    </span>
  )
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

  const marks = [device.browser, device.platform].filter((name) => name !== null)
  const hardware = marks.join(', ')
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
      <span
        data-device-frame
        className="-right-4 -bottom-5 absolute size-28 text-muted-foreground/15"
      >
        <Icon className="pointer-events-none size-full" aria-hidden="true" />
        <span
          className={cn('absolute flex items-center justify-center gap-1', SCREEN[device.kind])}
        >
          <MarkRow marks={marks} className="size-6 text-current" />
        </span>
      </span>

      <div className="relative min-w-0 flex-1">
        {renaming ? (
          <DeviceName session={session} title={title} onDone={onRenameDone} />
        ) : (
          <p className="truncate font-medium text-copy">{title}</p>
        )}

        {renaming ? (
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
