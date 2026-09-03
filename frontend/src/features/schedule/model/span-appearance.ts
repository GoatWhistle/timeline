import type { StageType } from '@/shared/api/types.gen'
import type { CalendarSpan } from './calendar-items'
import type { PackedSpan } from './pack-lanes'

const FALLBACK_TYPE: StageType = 'OTHER'

export function spanIsUnconfirmed(span: CalendarSpan): boolean {
  return span.row.stages.length === 0
}

export function primaryStageType(
  span: CalendarSpan,
  segment: Pick<PackedSpan<CalendarSpan>, 'startDay' | 'endDay'>,
): StageType {
  const overlapping = span.items.filter(
    (item) =>
      item.kind === 'bar' &&
      dayOf(span, item.startAt) <= segment.endDay &&
      dayOf(span, item.endAt) >= segment.startDay,
  )

  const first = overlapping[0]
  if (first?.kind === 'bar') return first.stage.type

  const anyStage = span.row.stages[0]
  return anyStage?.type ?? FALLBACK_TYPE
}

function dayOf(span: CalendarSpan, iso: string): number {
  const time = new Date(iso).getTime()
  const start = new Date(span.row.start_at).getTime()
  if (!Number.isFinite(time) || !Number.isFinite(start)) return span.startDay
  return span.startDay + Math.floor((time - start) / 86_400_000)
}
