import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { countdownLabel, countdownParts } from '@/entities/deadline/urgency/urgency-label'
import { i18n } from '@/shared/i18n/config'

const NOW = new Date('2026-03-10T12:00:00Z')
const HOUR = 3_600_000
const DAY = 86_400_000

function at(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString()
}

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('countdownParts', () => {
  it('counts down in hours inside the last day', () => {
    expect(countdownParts('today', at(HOUR * 5), NOW)).toEqual({ kind: 'hours', count: 5 })
  })

  it('counts down in days beyond the last day', () => {
    expect(countdownParts('soon', at(DAY * 3), NOW)).toEqual({ kind: 'days', count: 3 })
  })

  it('counts up once the deadline has passed', () => {
    expect(countdownParts('overdue', at(-DAY * 2 - HOUR), NOW)).toEqual({
      kind: 'overdue',
      count: 2,
    })
  })

  it('carries no count for a settled registration', () => {
    expect(countdownParts('done', at(DAY), NOW).kind).toBe('none')
    expect(countdownParts('waived', at(DAY), NOW).kind).toBe('none')
  })

  it('carries no count without a deadline', () => {
    expect(countdownParts('calm', null, NOW).kind).toBe('none')
  })

  it('never counts down to zero while the deadline is still ahead', () => {
    expect(countdownParts('today', at(60_000), NOW).count).toBe(1)
  })
})

describe('countdownLabel in russian', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ru')
  })

  it('declines the day for one, few and many', () => {
    expect(countdownLabel('soon', at(DAY * 1.5), NOW)).toBe('осталось 2 дня')
    expect(countdownLabel('soon', at(DAY * 5), NOW)).toBe('осталось 5 дней')
    expect(countdownLabel('calm', at(DAY * 21), NOW)).toBe('остался 21 день')
  })

  it('declines the overdue day the same way', () => {
    expect(countdownLabel('overdue', at(-DAY - HOUR), NOW)).toBe('просрочен на 1 день')
    expect(countdownLabel('overdue', at(-DAY * 3 - HOUR), NOW)).toBe('просрочен на 3 дня')
    expect(countdownLabel('overdue', at(-DAY * 7 - HOUR), NOW)).toBe('просрочен на 7 дней')
  })

  it('declines hours inside the last day', () => {
    expect(countdownLabel('today', at(HOUR), NOW)).toBe('остался 1 час')
    expect(countdownLabel('today', at(HOUR * 3), NOW)).toBe('осталось 3 часа')
    expect(countdownLabel('today', at(HOUR * 9), NOW)).toBe('осталось 9 часов')
  })

  it('says who made the mark rather than claiming a check', () => {
    expect(countdownLabel('done', at(DAY), NOW)).toBe('вы отметили')
    expect(countdownLabel('waived', at(DAY), NOW)).toBe('не требуется')
  })
})

describe('countdownLabel in english', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('uses the two english forms', () => {
    expect(countdownLabel('soon', at(DAY * 1.5), NOW)).toBe('2 days left')
    expect(countdownLabel('calm', at(DAY * 21), NOW)).toBe('21 days left')
    expect(countdownLabel('overdue', at(-DAY - HOUR), NOW)).toBe('overdue by 1 day')
    expect(countdownLabel('today', at(HOUR), NOW)).toBe('1 hour left')
  })

  it('keeps the wording a report, not a confirmation', () => {
    expect(countdownLabel('done', at(DAY), NOW)).toBe('you marked it')
  })
})
