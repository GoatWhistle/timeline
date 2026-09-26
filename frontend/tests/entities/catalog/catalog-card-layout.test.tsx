import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CARD_CORNER, CARD_GRID, CatalogCard } from '@/entities/catalog/catalog-card'
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

  it('puts each fact behind its own icon: the dates, then the format with the place', () => {
    const { container } = card()
    const facts = container.querySelector('[data-card-facts]') as HTMLElement
    const rows = [...facts.children]
    expect(rows[0]?.querySelector('svg.lucide-calendar-days')).toBeTruthy()
    expect(rows[0]?.textContent).toContain('7 days')
    expect(rows[1]?.textContent).toContain(i18n.t('event:place.format.HYBRID'))
    expect(rows[1]?.querySelector('[data-card-place]')?.textContent).toBe('Kazan')
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

  it('sets the prize on the team line, at its far end, with no rule above it', () => {
    const { container } = card()
    const stakes = container.querySelector('[data-card-stakes]') as HTMLElement
    expect(stakes.parentElement?.hasAttribute('data-card-facts')).toBe(true)
    expect(stakes.className).not.toContain('border-t')
    expect(stakes.querySelectorAll('svg.lucide-user')).toHaveLength(4)
    expect(stakes.lastElementChild?.textContent).toBe('$10,000')
    expect(stakes.lastElementChild?.className).toContain('ml-auto')
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

describe('the website arrow rides the corner of the cover, peeking just past its frame', () => {
  const link = () =>
    screen.getByRole('link', {
      name: i18n.t('event:catalog.card.websiteOf', { title: base.title }),
    })

  it('sits on the cover row at its far corner, nudged a hair outward', () => {
    card()
    const spot = link().parentElement as HTMLElement
    expect(spot.className, 'the arrow left the cover').toContain('row-start-1')
    expect(spot.className).toContain('justify-self-end')
    expect(spot.className, 'the arrow no longer peeks past the frame').toContain('-mt-0.5')
    expect(spot.className).toContain('-mr-0.5')
  })

  it('takes the whole title width, since the arrow no longer shares its line', () => {
    const { container } = card()
    expect(title(container).querySelector('[data-corner-room]')).toBeNull()
  })

  it('is a bare grey arrow, a size above the fact icons, with nothing behind it', () => {
    expect(CARD_CORNER, 'a plate or a ring came back behind the arrow').not.toMatch(
      /(^|\s)(border|bg-[\w-]+|shadow-[\w-]+|rounded-full|drop-shadow[\w-]*)(\s|$)/,
    )
    expect(CARD_CORNER, 'the arrow lost its quiet grey').toContain('text-muted-foreground')
    card()
    const svg = link().querySelector('svg.lucide-arrow-up-right') as SVGElement
    expect(svg.getAttribute('class')).toContain('size-6')
  })

  it('keeps the admin menu dots at their own size in the same grey corner', () => {
    expect(CARD_CORNER, 'the corner forces its glyph size onto the admin dots').not.toContain(
      '[&_svg]',
    )
  })
})
