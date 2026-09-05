import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EVENT_STATE_KEY } from '@/entities/event/event.labels'
import { EVENT_FORMAT_KEY } from '@/entities/stage/stage.place'
import { EVENT_KIND_KEY } from '@/features/schedule/model/event-kind'
import { BarTooltip } from '@/features/schedule/ui/schedule-bar/bar-tooltip'
import type { ScheduleRow } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { schedule } from './schedule-fixtures'

const base = schedule.rows[0] as ScheduleRow

const TITLE = 'Winter Sprint'

function rowWithCover(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    ...base,
    title: TITLE,
    cover_url: '/api/v1/covers/winter.png',
    prize_pool: '500000.00',
    prize_currency: 'RUB',
    ...overrides,
  }
}

describe('the hover card of a schedule bar', () => {
  it('shows the cover, so the card is recognisable before the words are read', () => {
    const { container } = renderWithProviders(<BarTooltip row={rowWithCover()} />)
    const image = container.querySelector('img')

    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('src', '/api/v1/covers/winter.png')
  })

  it('shows the title', () => {
    const { getByText } = renderWithProviders(<BarTooltip row={rowWithCover()} />)
    expect(getByText(TITLE)).toBeInTheDocument()
  })

  it('shows the prize as a bare figure, with no label spelling it out', () => {
    const { container, getByText } = renderWithProviders(<BarTooltip row={rowWithCover()} />)

    expect(getByText('500,000 ₽')).toBeInTheDocument()
    expect(container.textContent ?? '').not.toContain(i18n.t('schedule.prizePool'))
  })

  it('names the format the event runs in', () => {
    const { getByText } = renderWithProviders(<BarTooltip row={rowWithCover()} />)

    expect(getByText(i18n.t(EVENT_FORMAT_KEY.ONLINE))).toBeInTheDocument()
  })

  it('carries nothing but cover, title, format and prize: no kind, no dates, no key hint', () => {
    const { container } = renderWithProviders(<BarTooltip row={rowWithCover()} />)
    const text = container.textContent ?? ''

    expect(text).not.toContain(i18n.t('schedule.selectHint'))
    expect(text).not.toContain(i18n.t(EVENT_KIND_KEY.HACKATHON))
    expect(text).not.toContain(i18n.t(EVENT_STATE_KEY.ACTIVE))
    expect(text).not.toMatch(/2026/)
    expect(text).not.toContain('Participant registration')
  })

  it('falls back to the initial when the event has no cover, never a broken image', () => {
    const { container } = renderWithProviders(
      <BarTooltip row={rowWithCover({ cover_url: undefined })} />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('W')
  })

  it('drops the prize line entirely when the event has no prize pool', () => {
    const { container, queryByText } = renderWithProviders(
      <BarTooltip row={rowWithCover({ prize_pool: undefined, prize_currency: undefined })} />,
    )

    expect(queryByText(i18n.t('schedule.prizePool'))).toBeNull()
    expect(container.textContent).not.toContain('500')
  })
})
