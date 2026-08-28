import type { ScheduleItem, ScheduleRow, StageType } from '@/shared/api/types.gen'

export type MomentKind = 'checkpoint' | 'deadline'

export type BarItem = {
  kind: 'bar'
  id: string
  stage: ScheduleItem
  startAt: string
  endAt: string
  unconfirmed: boolean
}

export type MomentItem = {
  kind: 'moment'
  id: string
  moment: MomentKind
  at: string
  name: string
  stageType?: StageType
}

export type RowItem = BarItem | MomentItem

export const MOMENT_STAGE_TYPES: StageType[] = ['CHECKPOINT']

export const DEADLINE_ITEM_ID = 'registration-deadline'

const MOMENT_MAX_MS = 3_600_000

export function isMomentStage(stage: ScheduleItem): boolean {
  if (MOMENT_STAGE_TYPES.includes(stage.type)) return true
  return new Date(stage.end_at).getTime() - new Date(stage.start_at).getTime() <= MOMENT_MAX_MS
}

export function isUnconfirmed(stage: ScheduleItem, row: ScheduleRow): boolean {
  const start = new Date(stage.start_at).getTime()
  const end = new Date(stage.end_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true
  return start === new Date(row.start_at).getTime() && end === new Date(row.end_at).getTime()
}

export function buildRowItems(row: ScheduleRow): RowItem[] {
  const items: RowItem[] = []

  for (const stage of row.stages) {
    if (isMomentStage(stage)) {
      items.push({
        kind: 'moment',
        id: stage.id,
        moment: 'checkpoint',
        at: stage.start_at,
        name: stage.name,
        stageType: stage.type,
      })
      continue
    }
    items.push({
      kind: 'bar',
      id: stage.id,
      stage,
      startAt: stage.start_at,
      endAt: stage.end_at,
      unconfirmed: isUnconfirmed(stage, row),
    })
  }

  if (row.registration_deadline) {
    items.push({
      kind: 'moment',
      id: DEADLINE_ITEM_ID,
      moment: 'deadline',
      at: row.registration_deadline,
      name: '',
    })
  }

  return items.sort((a, b) => timeOf(a) - timeOf(b) || a.id.localeCompare(b.id))
}

export function timeOf(item: RowItem): number {
  return new Date(item.kind === 'bar' ? item.startAt : item.at).getTime()
}

export function barsOf(items: readonly RowItem[]): BarItem[] {
  return items.filter((item): item is BarItem => item.kind === 'bar')
}

export function momentsOf(items: readonly RowItem[]): MomentItem[] {
  return items.filter((item): item is MomentItem => item.kind === 'moment')
}
