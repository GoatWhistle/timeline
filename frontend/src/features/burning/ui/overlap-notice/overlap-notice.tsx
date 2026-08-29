import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BurningItem } from '@/features/burning/model/burning'
import { clusterDeadlines, findOverlaps, type Interval } from '@/features/burning/model/overlaps'
import { currentTimeZone } from '@/shared/datetime/datetime'

function intervals(items: readonly BurningItem[]): Interval[] {
  return items.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    startAt: item.event.start_at,
    endAt: item.event.end_at,
  }))
}

export function OverlapNotice({ items }: { items: readonly BurningItem[] }) {
  const { t } = useTranslation('event')
  const overlaps = findOverlaps(intervals(items))
  const clusters = clusterDeadlines(
    items.map((item) => ({ id: item.event.id, deadlineAt: item.deadlineAt })),
    currentTimeZone(),
  )

  if (overlaps.length === 0 && clusters.length === 0) return null

  const lines: string[] = []
  if (overlaps.length > 0) {
    lines.push(t('overlap.events', { count: overlaps.length }))
  }
  if (clusters.length > 0) {
    lines.push(t('overlap.deadlines', { count: clusters.length }))
  }

  return (
    <aside
      data-overlap-notice
      className="flex items-start gap-2 border-border border-b bg-surface-2 px-4 py-2"
    >
      <Layers aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="text-meta text-muted-foreground">
        <span className="font-medium">{t('overlap.label')}</span> {lines.join(' ')}
      </p>
    </aside>
  )
}
