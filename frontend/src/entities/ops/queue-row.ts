import type { Channel, NotificationStatus, QueueEntryResponse } from '@/shared/api/types.gen'

export type QueueRowKind = 'failed' | 'undeliverable' | 'stuck' | 'other'

export type QueueRowShape = {
  kind: QueueRowKind
  labelKey: string
  reasonKey: string
  tone: 'danger' | 'outline' | 'neutral'
}

const SHAPES: Record<QueueRowKind, QueueRowShape> = {
  failed: {
    kind: 'failed',
    labelKey: 'ops:kind.failed',
    reasonKey: 'ops:reason.failed',
    tone: 'danger',
  },
  undeliverable: {
    kind: 'undeliverable',
    labelKey: 'ops:kind.undeliverable',
    reasonKey: 'ops:reason.undeliverable',
    tone: 'danger',
  },
  stuck: {
    kind: 'stuck',
    labelKey: 'ops:kind.stuck',
    reasonKey: 'ops:reason.stuck',
    tone: 'outline',
  },
  other: {
    kind: 'other',
    labelKey: 'ops:kind.other',
    reasonKey: 'ops:reason.other',
    tone: 'neutral',
  },
}

export function classifyQueueRow(status: NotificationStatus | undefined): QueueRowShape {
  if (status === 'FAILED') return SHAPES.failed
  if (status === 'UNDELIVERABLE') return SHAPES.undeliverable
  if (status === 'PROCESSING') return SHAPES.stuck
  return SHAPES.other
}

export function overdueSeconds(entry: QueueEntryResponse): number | null {
  const value = entry.lease_overdue_seconds
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

export function triedChannels(entry: QueueEntryResponse): Channel[] {
  const tried = entry.failed_channels ?? []
  const seen = new Set<Channel>()
  const result: Channel[] = []
  for (const channel of tried) {
    if (seen.has(channel)) continue
    seen.add(channel)
    result.push(channel)
  }
  return result
}

export function hasNoChannelLeft(entry: QueueEntryResponse): boolean {
  return entry.status === 'UNDELIVERABLE' && triedChannels(entry).length === 0
}

export type OverdueParts = { days: number; hours: number; minutes: number; seconds: number }

export function splitOverdue(totalSeconds: number): OverdueParts {
  const total = Math.max(0, Math.floor(totalSeconds))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}
