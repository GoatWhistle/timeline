export type SpanInput = {
  id: string
  startDay: number
  endDay: number
}

export type Segment<T extends SpanInput> = {
  item: T
  week: number
  startDay: number
  endDay: number
  startColumn: number
  span: number
  lane: number
  clippedStart: boolean
  clippedEnd: boolean
}

export type WeekPacking<T extends SpanInput> = {
  segments: Segment<T>[]
  laneCount: number
  hidden: number
}

export type PackWeeksResult<T extends SpanInput> = {
  weeks: WeekPacking<T>[]
  laneCount: number
}

export const DAYS_PER_WEEK = 7
export const DEFAULT_MAX_LANES = 3

export function splitByWeek<T extends SpanInput>(item: T, weekCount: number): Segment<T>[] {
  const first = Math.max(0, item.startDay)
  const last = Math.min(weekCount * DAYS_PER_WEEK - 1, item.endDay)
  if (last < first) return []

  const segments: Segment<T>[] = []
  for (let day = first; day <= last; ) {
    const week = Math.floor(day / DAYS_PER_WEEK)
    const weekEnd = (week + 1) * DAYS_PER_WEEK - 1
    const segmentEnd = Math.min(last, weekEnd)
    segments.push({
      item,
      week,
      startDay: day,
      endDay: segmentEnd,
      startColumn: day - week * DAYS_PER_WEEK,
      span: segmentEnd - day + 1,
      lane: 0,
      clippedStart: day > item.startDay,
      clippedEnd: segmentEnd < item.endDay,
    })
    day = segmentEnd + 1
  }

  return segments
}

export function packWeeks<T extends SpanInput>(
  items: readonly T[],
  weekCount: number,
  maxLanes: number = DEFAULT_MAX_LANES,
): PackWeeksResult<T> {
  const weeks: WeekPacking<T>[] = Array.from({ length: Math.max(0, weekCount) }, () => ({
    segments: [],
    laneCount: 0,
    hidden: 0,
  }))

  const ordered = [...items].sort(
    (a, b) =>
      a.startDay - b.startDay ||
      b.endDay - b.startDay - (a.endDay - a.startDay) ||
      a.id.localeCompare(b.id),
  )

  const occupied = weeks.map(() => new Map<number, boolean[]>())

  for (const item of ordered) {
    const segments = splitByWeek(item, weeks.length)
    if (segments.length === 0) continue

    const lane = chooseLane(segments, occupied)

    for (const segment of segments) {
      segment.lane = lane
      reserve(occupied[segment.week], lane, segment.startColumn, segment.span)
      const week = weeks[segment.week]
      if (!week) continue
      if (lane >= maxLanes) week.hidden += 1
      else {
        week.segments.push(segment)
        week.laneCount = Math.max(week.laneCount, lane + 1)
      }
    }
  }

  return { weeks, laneCount: weeks.reduce((best, week) => Math.max(best, week.laneCount), 0) }
}

function chooseLane<T extends SpanInput>(
  segments: readonly Segment<T>[],
  occupied: Map<number, boolean[]>[],
): number {
  for (let lane = 0; ; lane += 1) {
    if (fitsEverywhere(segments, occupied, lane)) return lane
  }
}

function fitsEverywhere<T extends SpanInput>(
  segments: readonly Segment<T>[],
  occupied: Map<number, boolean[]>[],
  lane: number,
): boolean {
  return segments.every((segment) =>
    isFree(occupied[segment.week], lane, segment.startColumn, segment.span),
  )
}

function isFree(
  week: Map<number, boolean[]> | undefined,
  lane: number,
  startColumn: number,
  span: number,
): boolean {
  const cells = week?.get(lane)
  if (!cells) return true
  for (let offset = 0; offset < span; offset += 1) {
    if (cells[startColumn + offset]) return false
  }
  return true
}

function reserve(
  week: Map<number, boolean[]> | undefined,
  lane: number,
  startColumn: number,
  span: number,
): void {
  if (!week) return
  const cells = week.get(lane) ?? new Array<boolean>(DAYS_PER_WEEK).fill(false)
  for (let offset = 0; offset < span; offset += 1) cells[startColumn + offset] = true
  week.set(lane, cells)
}
