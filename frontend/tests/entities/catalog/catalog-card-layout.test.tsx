import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CARD_ARROW, CARD_CORNER, CARD_GRID, CatalogCard } from '@/entities/catalog/catalog-card'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const base: CatalogEvent = {
  id: 'e1',
  title: 'Northwind Agent Harness Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'WORLD',
  effective_format: 'HYBRID',
  offline_stages: [
    {
      id: 's1',
      name: 'Final',
      type: 'DEMO',
      start_at: '2026-08-29T00:00:00Z',
      end_at: '2026-08-30T00:00:00Z',
      place: { format: 'OFFLINE', country_code: 'RU', city: 'Kazan', inherited: false },
    },
  ],
  start_at: '2026-08-24T00:00:00Z',
  end_at: '2026-08-30T23:59:00Z',
  state: 'FINISHED',
  tracks: [
    { id: 'tr_1', track_no: 1, name: 'Agents', prize_total: '0' },
    { id: 'tr_2', track_no: 2, name: 'Voice', prize_total: '0' },
  ],
  team_size_min: 1,
  team_size_max: 4,
  prize_pool: '10000.00',
  prize_currency: 'USD',
  website_url: 'https://example.com',
  joined: false,
}

function card(event: Partial<CatalogEvent> = {}) {
  return renderWithProviders(
    <CatalogCard event={{ ...base, ...event }} selected={false} onSelect={vi.fn()} />,
  )
}

function title(container: HTMLElement) {
  return container.querySelector('[data-card-title]') as HTMLElement
}

describe('a catalog tile reads as title, facts, then what is at stake', () => {
  it('wraps the title greedily, so a word that fits stays on the first line', () => {
    const { container } = card()
    expect(
      title(container).className,
      'balanced or pretty wrapping pushes a fitting word down',
    ).not.toMatch(/text-balance|text-pretty|text-wrap/)
  })

  it('separates facts by space alone, with no middle dots between them', () => {
    const { container } = card()
    expect(container.textContent).not.toContain('·')
  })

  it('lays the facts on two columns: dates across, format and length, team and prize', () => {
    const { container } = card()
    const facts = container.querySelector('[data-card-facts]') as HTMLElement
    expect(facts.className, 'the facts fell back to a loose stack').toContain(
      'grid-cols-[minmax(0,1fr)_auto]',
    )
    const dates = facts.querySelector('[data-card-dates]')?.parentElement
      ?.parentElement as HTMLElement
    expect(dates.className).toContain('col-span-2')
    expect(dates.querySelector('svg.lucide-calendar-days')).toBeTruthy()
    const format = facts.querySelector('[data-card-format]') as HTMLElement
    expect(format.textContent).toBe(i18n.t('event:place.format.HYBRID'))
    expect(facts.querySelector('[data-card-place]')?.textContent).toBe('Kazan')
    const duration = facts.querySelector('[data-card-duration]') as HTMLElement
    expect(duration.textContent).toContain('7 days')
    expect(duration.className).toContain('col-start-2')
    expect(duration.className).toContain('justify-self-end')
    expect(duration.querySelector('svg.lucide-timer')).toBeTruthy()
  })

  it('draws the team as the figures used everywhere else, one per seat', () => {
    const { container } = card()
    const facts = container.querySelector('[data-card-facts]') as HTMLElement
    expect(facts.querySelectorAll('svg.lucide-user')).toHaveLength(4)
    expect(
      within(facts).getByText(i18n.t('event:place.teamRange', { min: 1, max: 4 })),
    ).toBeTruthy()
  })

  it('keeps the tracks off the tile, which only added a row of noise', () => {
    const { container } = card()
    expect(container.textContent).not.toContain(i18n.t('event:card.trackCount', { count: 2 }))
    expect(container.textContent).not.toContain('Agents')
  })

  it('sets the prize opposite the team, at the far end, with no rule above it', () => {
    const { container } = card()
    const stakes = container.querySelector('[data-card-stakes]') as HTMLElement
    const team = container.querySelector('[data-card-team]') as HTMLElement
    expect(stakes.parentElement?.hasAttribute('data-card-facts')).toBe(true)
    expect(stakes.className).not.toContain('border-t')
    expect(team.querySelectorAll('svg.lucide-user')).toHaveLength(4)
    expect(team.className).toContain('col-start-1')
    expect(stakes.textContent).toBe('$10,000')
    expect(stakes.className).toContain('col-start-2')
    expect(stakes.className).toContain('justify-self-end')
  })

  it('drops that line when neither the team nor the prize is known', () => {
    const { container } = card({
      team_size_min: undefined,
      team_size_max: undefined,
      prize_pool: undefined,
      prize_currency: undefined,
    })
    expect(container.querySelector('[data-card-stakes]')).toBeNull()
  })
})

describe('tiles in one row share their rows, so a missing field leaves no hole mid-card', () => {
  it('lays the tile on the rows of the list grid rather than stretching a column', () => {
    const { container } = card()
    const tile = container.querySelector('[data-card-rows]') as HTMLElement
    expect(tile.className).toContain('grid-rows-subgrid')
    expect(tile.className).toContain('row-span-3')
    expect(tile.className, 'a stretched column pushes the facts down again').not.toMatch(
      /h-full|mt-auto/,
    )
    const option = screen.getByRole('option')
    expect(option.className).toContain('grid-rows-subgrid')
    expect(option.className).toContain('row-span-3')
    expect(container.querySelector('.mt-auto')).toBeNull()
  })

  it('takes one more shared row when the admin footer is present', () => {
    const { container } = renderWithProviders(
      <CatalogCard event={base} selected={false} onSelect={vi.fn()} footer={<span>admin</span>} />,
    )
    const tile = container.querySelector('[data-card-rows]') as HTMLElement
    expect(tile.className).toContain('row-span-4')
    expect(screen.getByRole('option').className).toContain('row-span-4')
  })

  it('leaves the vertical rhythm to the tiles, since shared rows cannot take a row gap', () => {
    expect(CARD_GRID).toContain('grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]')
    expect(CARD_GRID).not.toMatch(/(^|\s)(sm:)?gap-(y-)?\d/)
  })
})

describe('the website arrow grows out of the corner of the cover frame', () => {
  const link = () =>
    screen.getByRole('link', {
      name: i18n.t('event:catalog.card.websiteOf', { title: base.title }),
    })

  it('sits on the cover row, tucked against its far corner', () => {
    card()
    const spot = link().parentElement as HTMLElement
    expect(spot.className, 'the arrow left the cover').toContain('row-start-1')
    expect(spot.className).toContain('justify-self-end')
    expect(spot.className, 'the arrow drifted off the frame corner').toContain('mt-[3.5px]')
    expect(spot.className).toContain('mr-[3.5px]')
  })

  it('takes the whole title width, since the arrow no longer shares its line', () => {
    const { container } = card()
    expect(title(container).querySelector('[data-corner-room]')).toBeNull()
  })

  it('wears the colour of the frame it grows from, at the same strength', () => {
    const { container } = card()
    const spot = link().parentElement as HTMLElement
    const cover = container.querySelector('[data-catalog-cover]') as HTMLElement
    expect(spot.getAttribute('data-event-family'), 'the arrow lost the event colour').toBe(
      cover.getAttribute('data-event-family'),
    )
    expect(spot.getAttribute('data-event-slot')).toBe(cover.getAttribute('data-event-slot'))
    expect(CARD_ARROW, 'the arrow went grey again').toContain('text-event-tint/70')
    expect(cover.className).toContain('after:border-event-tint/70')
  })

  it('is a small bare arrow drawn as thick as the frame, with nothing behind it', () => {
    expect(CARD_ARROW, 'a plate or a ring came back behind the arrow').not.toMatch(
      /(^|\s)(border|bg-[\w-]+|shadow-[\w-]+|rounded-full|drop-shadow[\w-]*)(\s|$)/,
    )
    card()
    const svg = link().querySelector('svg[data-corner-arrow]') as SVGElement
    expect(svg.getAttribute('class'), 'the arrow grew back').toContain('size-4')
    expect(Number(svg.getAttribute('stroke-width')) * (16 / 24), 'thinner than the frame').toBe(3)
    const [head, shaft] = [...svg.querySelectorAll('path')].map((path) => path.getAttribute('d'))
    expect(head, 'the head changed shape').toBe('M7 7h10v10')
    expect(shaft, 'the shaft grew back to full length').toBe('M10 14 17 7')
  })

  it('keeps the admin menu dots grey in their own corner', () => {
    expect(CARD_CORNER).toContain('text-muted-foreground')
    expect(CARD_CORNER).not.toContain('event-tint')
    const { container } = renderWithProviders(
      <CatalogCard event={base} selected={false} onSelect={vi.fn()} corner={<span>menu</span>} />,
    )
    const spot = container.querySelector('[data-card-corner]') as HTMLElement
    expect(spot.hasAttribute('data-event-family'), 'the admin corner took the event colour').toBe(
      false,
    )
    expect(spot.className).toContain('-mt-0.5')
  })
})
