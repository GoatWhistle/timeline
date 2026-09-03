import { afterEach, beforeEach, vi } from 'vitest'
import type { EventResponse } from '@/shared/api/types.gen'
import { setTimeZone } from '@/shared/datetime/datetime'

export const EVENT = {
  id: 'ev_1',
  title: 'Existing',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'RU',
  effective_format: 'ONLINE',
  start_at: '2026-05-01T07:00:00Z',
  end_at: '2026-05-03T15:00:00Z',
  state: 'UPCOMING',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as EventResponse

export function fixMoscowClock(): void {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-04-20T09:00:00Z'))
    setTimeZone('Europe/Moscow')
  })

  afterEach(() => {
    vi.useRealTimers()
    setTimeZone(undefined)
  })
}

export type StageName = 'kind' | 'basics' | 'period' | 'place' | 'prize'

export function stageStep(stage: StageName): HTMLElement {
  const step = document.querySelector<HTMLElement>(`[data-stage-step="${stage}"] button`)
  if (!step) throw new Error(`no stage ${stage}`)
  return step
}

export async function goToStage(
  user: { click: (element: Element) => Promise<void> },
  stage: StageName,
): Promise<void> {
  await user.click(stageStep(stage))
}

export function lastStage(): StageName {
  const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-step]'))
  const last = steps[steps.length - 1]?.dataset.stageStep
  if (!last) throw new Error('no stages')
  return last as StageName
}

export async function submitForm(user: {
  click: (element: Element) => Promise<void>
}): Promise<void> {
  await goToStage(user, lastStage())
  const button = document.querySelector<HTMLElement>('[data-event-form] button[type="submit"]')
  if (!button) throw new Error('no submit button')
  await user.click(button)
}

export function currentStage(): string | undefined {
  return document.querySelector<HTMLElement>('[data-event-stage]')?.dataset.eventStage
}

export function trigger(id: string): HTMLElement {
  const node = document.getElementById(id)
  if (!node) throw new Error(`no ${id}`)
  return node
}

export function dayCells(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button[data-date]'))
}

export function day(date: string): HTMLElement {
  const cell = dayCells().find((candidate) => candidate.dataset.date === date)
  if (!cell) throw new Error(`no day ${date}`)
  return cell
}

export function timeField(id: string): HTMLInputElement {
  return trigger(id) as HTMLInputElement
}
