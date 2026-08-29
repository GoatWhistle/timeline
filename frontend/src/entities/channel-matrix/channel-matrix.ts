import type { Channel, NotificationRuleResponse } from '@/shared/api/types.gen'

export const DELIVERY_CHANNELS: Channel[] = ['TELEGRAM', 'EMAIL']

export type CellState = 'chosen' | 'fallback' | 'off' | 'mirror'

export type MatrixRow = {
  ruleId: string
  slotNo: number
  offsetMinutes: number
  enabled: boolean
  cells: Record<Channel, CellState>
  mirror: CellState
}

export function resolveChannel(
  override: Channel | undefined,
  preferred: Channel | undefined,
): { channel: Channel; explicit: boolean } {
  if (override) return { channel: override, explicit: true }
  if (preferred) return { channel: preferred, explicit: false }
  return { channel: 'TELEGRAM', explicit: false }
}

export function buildRow(
  rule: NotificationRuleResponse,
  preferred: Channel | undefined,
): MatrixRow {
  const { channel, explicit } = resolveChannel(rule.channel_override, preferred)
  const cells = {} as Record<Channel, CellState>

  for (const candidate of DELIVERY_CHANNELS) {
    if (!rule.enabled) {
      cells[candidate] = 'off'
      continue
    }
    cells[candidate] = candidate === channel ? (explicit ? 'chosen' : 'fallback') : 'off'
  }

  return {
    ruleId: rule.id ?? '',
    slotNo: rule.slot_no ?? 0,
    offsetMinutes: rule.offset_minutes ?? 0,
    enabled: rule.enabled === true,
    cells,
    mirror: 'mirror',
  }
}

export function buildMatrix(
  rules: NotificationRuleResponse[],
  preferred: Channel | undefined,
): MatrixRow[] {
  return [...rules]
    .sort((a, b) => (a.slot_no ?? 0) - (b.slot_no ?? 0))
    .map((rule) => buildRow(rule, preferred))
}

export function countByChannel(rows: MatrixRow[]): Record<Channel, number> {
  const totals = { TELEGRAM: 0, EMAIL: 0 } as Record<Channel, number>
  for (const row of rows) {
    for (const channel of DELIVERY_CHANNELS) {
      if (row.cells[channel] === 'chosen' || row.cells[channel] === 'fallback') {
        totals[channel] += 1
      }
    }
  }
  return totals
}
