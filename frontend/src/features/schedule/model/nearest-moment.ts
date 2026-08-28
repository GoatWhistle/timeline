import type { MomentItem, RowItem } from './row-items'
import { momentsOf } from './row-items'

export function nearestUpcomingMoment(
  items: readonly RowItem[],
  now: Date = new Date(),
): MomentItem | undefined {
  const reference = now.getTime()
  let best: MomentItem | undefined
  let bestAt = Number.POSITIVE_INFINITY

  for (const moment of momentsOf(items)) {
    const at = new Date(moment.at).getTime()
    if (!Number.isFinite(at) || at < reference) continue
    if (at < bestAt) {
      best = moment
      bestAt = at
    }
  }

  return best
}

export function nearestUpcomingId(
  items: readonly RowItem[],
  now: Date = new Date(),
): string | undefined {
  return nearestUpcomingMoment(items, now)?.id
}
