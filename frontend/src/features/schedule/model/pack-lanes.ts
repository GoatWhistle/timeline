export type SpanInput = {
  id: string
  startDay: number
  endDay: number
}

export type PackedSpan<T extends SpanInput> = {
  item: T
  startDay: number
  endDay: number
  span: number
  lane: number
  clippedStart: boolean
  clippedEnd: boolean
}

export type PackResult<T extends SpanInput> = {
  packed: PackedSpan<T>[]
  laneCount: number
  hidden: T[]
}

export const DAYS_PER_WEEK = 7
export const DEFAULT_MAX_LANES = 12

export const LANE_SEPARATION_DAYS = 1

export function packTimeline<T extends SpanInput>(
  items: readonly T[],
  dayCount: number,
  maxLanes: number = DEFAULT_MAX_LANES,
): PackResult<T> {
  const ordered = [...items].sort(
    (a, b) =>
      a.startDay - b.startDay ||
      b.endDay - b.startDay - (a.endDay - a.startDay) ||
      a.id.localeCompare(b.id),
  )

  const lanes: number[] = []
  const packed: PackedSpan<T>[] = []
  const hidden: T[] = []

  for (const item of ordered) {
    const startDay = Math.max(0, item.startDay)
    const endDay = Math.min(dayCount - 1, item.endDay)
    if (endDay < startDay) continue

    const lane = lanes.findIndex((occupiedUntil) => startDay > occupiedUntil)
    const target = lane === -1 ? lanes.length : lane

    if (target >= maxLanes) {
      hidden.push(item)
      continue
    }

    lanes[target] = endDay + LANE_SEPARATION_DAYS
    packed.push({
      item,
      startDay,
      endDay,
      span: endDay - startDay + 1,
      lane: target,
      clippedStart: item.startDay < 0,
      clippedEnd: item.endDay > dayCount - 1,
    })
  }

  return { packed, laneCount: lanes.length, hidden }
}
