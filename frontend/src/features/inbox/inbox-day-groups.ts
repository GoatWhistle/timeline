import { TZDate } from '@date-fns/tz'
import { isSameDay, isSameYear, subDays } from 'date-fns'
import type { InboxItemResponse } from '@/shared/api/types.gen'
import { currentTimeZone } from '@/shared/datetime/datetime'

export type DayGroup = {
  key: string
  date: Date
  items: InboxItemResponse[]
}

function zoned(date: Date, zone: string): TZDate {
  return new TZDate(date, zone)
}

export function groupByDay(
  items: InboxItemResponse[],
  zone: string = currentTimeZone(),
): DayGroup[] {
  const groups: DayGroup[] = []
  for (const item of items) {
    const date = new Date(item.created_at)
    const last = groups[groups.length - 1]
    if (last && isSameDay(zoned(last.date, zone), zoned(date, zone))) {
      last.items.push(item)
      continue
    }
    groups.push({ key: item.created_at.slice(0, 10), date, items: [item] })
  }
  return groups
}

export type DayLabelKind = 'today' | 'yesterday' | 'thisYear' | 'other'

export function dayLabelKind(
  date: Date,
  now: Date = new Date(),
  zone: string = currentTimeZone(),
): DayLabelKind {
  const zonedDate = zoned(date, zone)
  const zonedNow = zoned(now, zone)
  if (isSameDay(zonedDate, zonedNow)) return 'today'
  if (isSameDay(zonedDate, subDays(zonedNow, 1))) return 'yesterday'
  if (isSameYear(zonedDate, zonedNow)) return 'thisYear'
  return 'other'
}
