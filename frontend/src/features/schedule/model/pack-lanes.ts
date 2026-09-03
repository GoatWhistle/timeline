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

export type TimedInput = {
  id: string
  startMinute: number
  endMinute: number
}

export type PackedTimed<T extends TimedInput> = {
  item: T
  startMinute: number
  endMinute: number
  column: number
  columns: number
}

export const MIN_TIMED_MINUTES = 30

export function packDayColumns<T extends TimedInput>(items: readonly T[]): PackedTimed<T>[] {
  const ordered = [...items]
    .map((item) => ({
      item,
      startMinute: item.startMinute,
      endMinute: Math.max(item.endMinute, item.startMinute + MIN_TIMED_MINUTES),
    }))
    .sort((a, b) => a.startMinute - b.startMinute || a.item.id.localeCompare(b.item.id))

  const result: PackedTimed<T>[] = []
  let cluster: typeof ordered = []
  let clusterEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    if (cluster.length === 0) return
    const columnEnds: number[] = []
    const assigned = cluster.map((entry) => {
      let column = columnEnds.findIndex((end) => end <= entry.startMinute)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(entry.endMinute)
      } else {
        columnEnds[column] = entry.endMinute
      }
      return { ...entry, column }
    })
    for (const entry of assigned) result.push({ ...entry, columns: columnEnds.length })
    cluster = []
    clusterEnd = Number.NEGATIVE_INFINITY
  }

  for (const entry of ordered) {
    if (entry.startMinute >= clusterEnd) flush()
    cluster.push(entry)
    clusterEnd = Math.max(clusterEnd, entry.endMinute)
  }
  flush()

  return result
}

export const DEFAULT_HOUR_START = 8
export const DEFAULT_HOUR_END = 23

export function hourWindow(minutes: readonly { startMinute: number; endMinute: number }[]): {
  startHour: number
  endHour: number
} {
  let startHour = DEFAULT_HOUR_START
  let endHour = DEFAULT_HOUR_END
  for (const entry of minutes) {
    startHour = Math.min(startHour, Math.floor(entry.startMinute / 60))
    endHour = Math.max(endHour, Math.ceil(entry.endMinute / 60))
  }
  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  }
}
