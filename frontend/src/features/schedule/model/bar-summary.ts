import { resolveUrgency, URGENCY_KEY, type Urgency } from '@/entities/deadline/urgency/urgency'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import type { EventColor, ScheduleRow } from '@/shared/api/types.gen'
import type { CalendarSpan } from './calendar-items'
import type { RowItem } from './row-items'
import type { Translate } from './row-sentence'
import { stageProgress } from './stage-progress'

export type BarSummaryContext = {
  t: Translate
  formatDate: (iso: string) => string
  now: Date
}

export type BarSummary = {
  title: string
  dates: string
  registration: string
  urgency: Urgency
  registered: boolean
  nextStage: string
  state: string
  color: EventColor | null
}

export function registrationLine(row: ScheduleRow, ctx: BarSummaryContext): string {
  const status = row.registration_status?.status ?? null
  const urgency = resolveUrgency({ deadlineAt: row.registration_deadline, status, now: ctx.now })

  if (!row.registration_deadline) return ctx.t(URGENCY_KEY[urgency])
  return ctx.t('schedule.barRegistration', {
    urgency: ctx.t(URGENCY_KEY[urgency]),
    date: ctx.formatDate(row.registration_deadline),
  })
}

export function nextStageLine(
  row: ScheduleRow,
  items: readonly RowItem[],
  ctx: BarSummaryContext,
): string {
  const progress = stageProgress(row.stages, ctx.now)
  const step = progress.steps[progress.currentIndex]
  if (!step) return ''

  const upcoming = items.find(
    (item) => item.kind === 'moment' && new Date(item.at).getTime() >= ctx.now.getTime(),
  )
  if (upcoming?.kind === 'moment' && upcoming.moment === 'checkpoint') {
    return ctx.t('schedule.barNextCheckpoint', {
      name: upcoming.name,
      date: ctx.formatDate(upcoming.at),
    })
  }

  return ctx.t('schedule.barNextStage', {
    name: step.name,
    current: progress.currentIndex + 1,
    total: progress.total,
  })
}

export function barSummary(span: CalendarSpan, ctx: BarSummaryContext): BarSummary {
  const { row } = span
  const status = row.registration_status?.status ?? null

  return {
    title: row.title,
    dates: ctx.t('schedule.barDates', {
      start: ctx.formatDate(row.start_at),
      end: ctx.formatDate(row.end_at),
    }),
    registration: registrationLine(row, ctx),
    urgency: resolveUrgency({ deadlineAt: row.registration_deadline, status, now: ctx.now }),
    registered: status === 'DONE',
    nextStage: nextStageLine(row, span.items, ctx),
    state: ctx.t(EVENT_STATE_KEY[row.state]),
    color: row.color ?? null,
  }
}
