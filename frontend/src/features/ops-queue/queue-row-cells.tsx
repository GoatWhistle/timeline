import { AlertTriangle, Ban, CircleHelp, Timer } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { CHANNEL_KEY, NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import {
  classifyQueueRow,
  hasNoChannelLeft,
  type QueueRowKind,
  triedChannels,
} from '@/entities/ops/queue-row'
import type { QueueEntryResponse } from '@/shared/api/types.gen'
import { Badge } from '@/shared/ui/primitives/badge'

const KIND_ICON: Record<QueueRowKind, ComponentType<{ className?: string }>> = {
  failed: AlertTriangle,
  undeliverable: Ban,
  stuck: Timer,
  other: CircleHelp,
}

export function KindCell({ entry }: { entry: QueueEntryResponse }) {
  const { t } = useTranslation()
  const shape = classifyQueueRow(entry.status)
  const Icon = KIND_ICON[shape.kind]

  return (
    <Badge tone={shape.tone} className="whitespace-nowrap">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {t(shape.labelKey)}
    </Badge>
  )
}

export function ReasonCell({ entry }: { entry: QueueEntryResponse }) {
  const { t } = useTranslation()
  const shape = classifyQueueRow(entry.status)
  const message = entry.last_error?.trim()

  return (
    <div className="min-w-0">
      <p className="truncate text-copy" title={message || undefined}>
        {message || t('ops:noError')}
      </p>
      <p className="mt-0.5 truncate text-meta text-muted-foreground">{t(shape.reasonKey)}</p>
    </div>
  )
}

export function ChannelsCell({ entry }: { entry: QueueEntryResponse }) {
  const { t } = useTranslation()
  const tried = triedChannels(entry)

  if (hasNoChannelLeft(entry)) {
    return <span className="text-meta text-muted-foreground">{t('ops:noChannels')}</span>
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-copy">
        {tried.length > 0
          ? tried.map((channel) => t(CHANNEL_KEY[channel])).join(' → ')
          : t('ops:noChannels')}
      </span>
      {entry.requested_channel ? (
        <span className="text-meta text-muted-foreground">
          {t('ops:requestedChannel', { channel: t(CHANNEL_KEY[entry.requested_channel]) })}
        </span>
      ) : null}
    </div>
  )
}

export function TypeCell({ entry }: { entry: QueueEntryResponse }) {
  const { t } = useTranslation()
  if (!entry.notification_type) return <span className="text-muted-foreground">—</span>
  return <span className="text-copy">{t(NOTIFICATION_TYPE_KEY[entry.notification_type])}</span>
}
