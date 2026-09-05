import { resolveUrgency, URGENCY_KEY } from '@/entities/deadline/urgency/urgency'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { STAGE_TYPE_KEY } from '@/entities/stage/stage.labels'
import type { ScheduleRow } from '@/shared/api/types.gen'
import { EVENT_KIND_KEY } from './event-kind'
import type { RowItem } from './row-items'

export type Translate = (key: string, values?: Record<string, unknown>) => string

export type SentenceContext = {
  t: Translate
  formatDate: (iso: string) => string
  formatRemaining: (iso: string) => string
  now?: Date
}

export function rowSentence(row: ScheduleRow, items: readonly RowItem[], ctx: SentenceContext) {
  const { t, formatDate } = ctx
  const parts = [
    `${row.title}.`,
    `${t(EVENT_KIND_KEY[row.kind])}.`,
    `${t(EVENT_STATE_KEY[row.state])}.`,
  ]

  const stages = items.filter((item) => item.kind === 'bar')
  if (stages.length > 0) {
    const listed = stages
      .map((item) =>
        item.kind === 'bar'
          ? t('schedule.sentenceStage', {
              name: item.stage.name,
              start: formatDate(item.startAt),
              end: formatDate(item.endAt),
            })
          : '',
      )
      .join(', ')
    parts.push(t('schedule.sentenceStages', { count: stages.length, list: listed }))
  }

  const checkpoints = items.filter((item) => item.kind === 'moment' && item.moment === 'checkpoint')
  for (const checkpoint of checkpoints) {
    if (checkpoint.kind !== 'moment') continue
    parts.push(
      t('schedule.sentenceCheckpoint', {
        name: checkpoint.name,
        date: formatDate(checkpoint.at),
      }),
    )
  }

  if (row.registration_deadline) {
    parts.push(
      t('schedule.sentenceDeadline', {
        date: formatDate(row.registration_deadline),
        remaining: ctx.formatRemaining(row.registration_deadline),
      }),
      `${t(
        URGENCY_KEY[
          resolveUrgency({
            deadlineAt: row.registration_deadline,
            status: row.registration_status?.status ?? null,
            now: ctx.now,
          })
        ],
      )}.`,
    )
  }

  parts.push(`${t('schedule.selectHint')}.`)

  return parts.join(' ')
}

export function itemSentence(item: RowItem, ctx: SentenceContext): string {
  const { t, formatDate } = ctx
  if (item.kind === 'bar') {
    return t('schedule.sentenceBar', {
      name: item.stage.name,
      type: t(STAGE_TYPE_KEY[item.stage.type]),
      start: formatDate(item.startAt),
      end: formatDate(item.endAt),
    })
  }
  if (item.moment === 'deadline') {
    return t('schedule.sentenceDeadline', {
      date: formatDate(item.at),
      remaining: ctx.formatRemaining(item.at),
    })
  }
  return t('schedule.sentenceCheckpoint', { name: item.name, date: formatDate(item.at) })
}
