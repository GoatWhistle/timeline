import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { enUS } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { WeekGrid } from '@/features/schedule/ui/week-grid/week-grid'
import { WEEK_AXIS_WIDTH } from '@/features/schedule/ui/week-grid/week-layout'
import type { ScheduleResponse } from '@/shared/api/types.gen'
import { LOCALES } from '@/shared/i18n/locale'

const LABEL_FONT_SIZE = 12
const LABEL_PADDING_END = 8
const WIDEST_GLYPH_EM = 0.625
const GUTTER_TEXT = WEEK_AXIS_WIDTH - LABEL_PADDING_END

function textWidth(value: string): number {
  return value.length * LABEL_FONT_SIZE * WIDEST_GLYPH_EM
}

function widestWord(sentence: string): string {
  return sentence
    .split(/\s+/)
    .reduce((longest, word) => (word.length > longest.length ? word : longest), '')
}

const WEEK_FROM = new Date('2026-01-05T00:00:00')
const WEEK_TO = new Date('2026-01-11T23:59:59')
const NOW = new Date('2026-01-07T12:00:00')

const empty: ScheduleResponse = {
  range: { from: WEEK_FROM.toISOString(), to: WEEK_TO.toISOString() },
  rows: [],
}

function renderWeek() {
  return renderWithProviders(
    <WeekGrid data={empty} from={WEEK_FROM} to={WEEK_TO} locale={enUS} now={NOW} />,
  )
}

function label(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-schedule-band] > :first-child')
}

describe('the all-day band names itself inside a gutter it actually fits', () => {
  it('prints a gutter-sized label, the long sentence having spilled across the day columns', () => {
    const { container } = renderWeek()
    const shown = label(container)?.querySelector('[aria-hidden="true"]')

    expect(shown?.textContent).toBe('All day')
    expect(shown?.textContent).not.toContain('multi-day')
  })

  it('still reads the whole sentence to a screen reader, the short label being for the eye', () => {
    const { container } = renderWeek()
    const spoken = label(container)?.querySelector('.sr-only')

    expect(spoken?.textContent).toBe('All day and multi-day')
  })

  it('hides the short label from the reader, so the band is not announced twice', () => {
    const { container } = renderWeek()

    expect(label(container)?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(label(container)?.textContent).toBe('All dayAll day and multi-day')
  })

  it('keeps the visible label shorter than the sentence it stands for', () => {
    const { container } = renderWeek()
    const shown = label(container)?.querySelector('[aria-hidden="true"]')?.textContent ?? ''
    const spoken = label(container)?.querySelector('.sr-only')?.textContent ?? ''

    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(spoken.length)
  })

  it('leaves the gutter narrow enough that a long label would have had to wrap', () => {
    expect(WEEK_AXIS_WIDTH).toBeLessThan(80)
  })
})

describe('the gutter is wide enough for the label every locale actually prints', () => {
  it.each(LOCALES)('fits the longest word of the %s short label without wrapping', (locale) => {
    const label = text(locale, 'common', 'schedule.allDayShort')
    const longest = widestWord(label)

    expect(longest.length).toBeGreaterThan(0)
    expect(
      textWidth(longest),
      `"${longest}" needs ${textWidth(longest).toFixed(1)}px but the gutter offers ${GUTTER_TEXT}px`,
    ).toBeLessThanOrEqual(GUTTER_TEXT)
  })

  it.each(LOCALES)(
    'would have had to wrap the full %s sentence, which is why it is short',
    (locale) => {
      const full = text(locale, 'common', 'schedule.allDay')

      expect(textWidth(widestWord(full))).toBeGreaterThan(0)
      expect(textWidth(full)).toBeGreaterThan(GUTTER_TEXT)
    },
  )

  it('measures the gutter from the axis width and the padding the sheet declares', () => {
    const sheet = readFileSync(
      resolve(process.cwd(), 'src/features/schedule/ui/week-grid/week-grid.module.css'),
      'utf8',
    )
    const block = sheet.slice(sheet.indexOf('.bandLabel'))

    expect(block).toContain(`padding-inline-end: ${LABEL_PADDING_END}px`)
    expect(GUTTER_TEXT).toBe(WEEK_AXIS_WIDTH - LABEL_PADDING_END)
  })
})
