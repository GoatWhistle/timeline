import { describe, expect, it } from 'vitest'
import {
  acceptDateText,
  DATE_TEXT_PATTERN,
  formatDateText,
  parseDateText,
} from '@/shared/ui/forms/calendar/date-text'

describe('a date typed by hand is read the way the placeholder promises', () => {
  it('announces the order it expects, day before month before year', () => {
    expect(DATE_TEXT_PATTERN).toBe('dd.mm.yyyy')
  })

  it('reads the promised shape', () => {
    expect(parseDateText('17.09.2026')).toBe('2026-09-17')
  })

  it('reads a day and a month written without their leading zero', () => {
    expect(parseDateText('3.7.2026')).toBe('2026-07-03')
  })

  it('takes the separators a keyboard offers instead of the dot', () => {
    expect(parseDateText('17/09/2026')).toBe('2026-09-17')
    expect(parseDateText('17-09-2026')).toBe('2026-09-17')
    expect(parseDateText('17 09 2026')).toBe('2026-09-17')
    expect(parseDateText('17,09,2026')).toBe('2026-09-17')
  })

  it('reads bare digits, the fastest thing to type', () => {
    expect(parseDateText('17092026')).toBe('2026-09-17')
  })

  it('expands a two-digit year into this century rather than year 26', () => {
    expect(parseDateText('17.09.26')).toBe('2026-09-17')
    expect(parseDateText('170926')).toBe('2026-09-17')
  })

  it('ignores the spaces around what was typed', () => {
    expect(parseDateText('  17.09.2026  ')).toBe('2026-09-17')
  })

  it('reads the machine shape too, so a pasted value is not lost', () => {
    expect(parseDateText('2026-09-17')).toBe('2026-09-17')
  })
})

describe('what cannot be a date is refused rather than guessed', () => {
  it('refuses a day that month never had', () => {
    expect(parseDateText('31.02.2026')).toBeNull()
  })

  it('refuses a month past twelve', () => {
    expect(parseDateText('01.13.2026')).toBeNull()
  })

  it('refuses letters', () => {
    expect(parseDateText('tomorrow')).toBeNull()
  })

  it('refuses an empty field', () => {
    expect(parseDateText('')).toBeNull()
    expect(parseDateText('   ')).toBeNull()
  })

  it('refuses a half-typed date rather than inventing the missing part', () => {
    expect(parseDateText('17.09')).toBeNull()
    expect(parseDateText('1709')).toBeNull()
  })

  it('keeps the leap day only in a year that has one', () => {
    expect(parseDateText('29.02.2028')).toBe('2028-02-29')
    expect(parseDateText('29.02.2026')).toBeNull()
  })
})

describe('a stored date is shown back in the shape it is typed', () => {
  it('writes the day first, padded, so the column stays put', () => {
    expect(formatDateText('2026-09-07')).toBe('07.09.2026')
  })

  it('shows nothing at all when there is no date', () => {
    expect(formatDateText('')).toBe('')
    expect(formatDateText('not-a-date')).toBe('')
  })

  it('survives the round trip both ways', () => {
    expect(parseDateText(formatDateText('2026-09-17'))).toBe('2026-09-17')
  })
})

describe('typing is not fought while it is still half done', () => {
  it('keeps the separator the person chose instead of rewriting it', () => {
    expect(acceptDateText('3/7/26')).toBe('3/7/26')
  })

  it('keeps a partial date so the next keystroke can finish it', () => {
    expect(acceptDateText('17.0')).toBe('17.0')
  })

  it('drops what can never belong to a date', () => {
    expect(acceptDateText('17a.b09')).toBe('17.09')
  })

  it('stops at the length a full date needs', () => {
    expect(acceptDateText('1709202612345')).toHaveLength(10)
  })
})
