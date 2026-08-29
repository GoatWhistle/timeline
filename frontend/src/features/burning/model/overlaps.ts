export type Interval = {
  id: string
  title: string
  startAt: string
  endAt: string
}

export type Overlap = {
  first: Interval
  second: Interval
}

export type DeadlineCluster = {
  day: string
  ids: string[]
}

function bounds(item: Interval): [number, number] | null {
  const start = Date.parse(item.startAt)
  const end = Date.parse(item.endAt)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return start <= end ? [start, end] : [end, start]
}

export function findOverlaps(items: readonly Interval[]): Overlap[] {
  const overlaps: Overlap[] = []

  for (let i = 0; i < items.length; i += 1) {
    const first = items[i]
    if (!first) continue
    const left = bounds(first)
    if (!left) continue
    for (let j = i + 1; j < items.length; j += 1) {
      const second = items[j]
      if (!second) continue
      const right = bounds(second)
      if (!right) continue
      if (left[0] <= right[1] && right[0] <= left[1]) {
        overlaps.push({ first, second })
      }
    }
  }

  return overlaps
}

export function clusterDeadlines(
  deadlines: readonly { id: string; deadlineAt: string | null | undefined }[],
  timeZone: string,
): DeadlineCluster[] {
  const byDay = new Map<string, string[]>()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  for (const item of deadlines) {
    if (!item.deadlineAt) continue
    const parsed = Date.parse(item.deadlineAt)
    if (Number.isNaN(parsed)) continue
    const day = formatter.format(new Date(parsed))
    const bucket = byDay.get(day)
    if (bucket) bucket.push(item.id)
    else byDay.set(day, [item.id])
  }

  return [...byDay.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([day, ids]) => ({ day, ids }))
    .sort((a, b) => a.day.localeCompare(b.day))
}
