import type { BurningItem } from './burning'

export type BurningSummary = {
  overdue: number
  today: number
  soon: number
  starting: number
  actionable: number
  total: number
}

export function summarize(items: readonly BurningItem[]): BurningSummary {
  const summary: BurningSummary = {
    overdue: 0,
    today: 0,
    soon: 0,
    starting: 0,
    actionable: 0,
    total: items.length,
  }

  for (const item of items) {
    if (item.urgency === 'overdue') summary.overdue += 1
    if (item.urgency === 'today') summary.today += 1
    if (item.urgency === 'soon') summary.soon += 1
    if (item.reason === 'starting') summary.starting += 1
    if (item.actionable) summary.actionable += 1
  }

  return summary
}

export function isQuiet(summary: BurningSummary): boolean {
  return summary.overdue === 0 && summary.today === 0 && summary.soon === 0
}
