import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { EVENT_STATE_TEXT } from '@/entities/event/event-state-mark/event-state-sign'
import { EventOverlayBody } from '@/features/event-overlay-card/event-overlay-body'
import type { OverlayCard } from '@/features/event-overlay-card/overlay-model'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Centred hackathon',
  organizer: 'Committee',
  description: 'A card that opens over the content',
  websiteUrl: 'https://example.com',
  coverUrl: null,
  color: { family: 'RU', slot: 4 },
  state: 'ACTIVE',
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-03T18:00:00Z',
  deadlineAt: null,
  status: null,
  facts: {
    effectiveFormat: 'HYBRID',
    prizePool: '750000.00',
    prizeCurrency: 'RUB',
    teamSizeMin: 1,
    teamSizeMax: 4,
    tracks: [],
    place: { format: 'OFFLINE', country_code: 'RU', city: 'Moscow', inherited: false },
  },
  stages: [],
  joined: true,
}

function draw() {
  return renderWithProviders(<EventOverlayBody card={card} canOpenAdmin={false} />)
}

describe('the event window reads like the tile it was opened from', () => {
  it('frames the cover the way a tile does, in the event colour', () => {
    const { container } = draw()
    const frame = container.querySelector('[data-overlay-cover] [data-catalog-cover]')
    expect(frame, 'the window drew its own cover again').not.toBeNull()
    expect(frame?.className).toContain('after:border-3')
    expect(frame?.className).toContain('after:border-event-tint/70')
    expect(screen.getByText(i18n.t('event:catalog.card.noCover'))).toBeTruthy()
  })

  it('lays the facts out as labelled fields, the state first and the dates apart', () => {
    const { container } = draw()
    const names = [...container.querySelectorAll('[data-overlay-fact]')].map((node) =>
      node.getAttribute('data-overlay-fact'),
    )
    expect(names).toEqual(['state', 'start', 'end', 'format', 'prize', 'team'])
    const field = (name: string) =>
      container.querySelector(`[data-overlay-fact="${name}"]`) as HTMLElement
    expect(field('start').querySelector('dt')?.textContent).toBe(
      i18n.t('event:catalog.sort.start_at'),
    )
    expect(field('end').querySelector('dt')?.textContent).toBe(i18n.t('event:catalog.sort.end_at'))
    expect(field('start').querySelector('dd')?.textContent, 'the start lost its time').toMatch(
      /\d{1,2}:\d{2}/,
    )
    expect(field('end').querySelector('dd')?.textContent).toMatch(/\d{1,2}:\d{2}/)
    const dates = container.querySelector('[data-overlay-dates]') as HTMLElement
    expect(dates.className, 'the dates sit side by side again').toContain('flex-col')
    expect([...dates.children].map((node) => node.getAttribute('data-overlay-fact'))).toEqual([
      'start',
      'end',
    ])
    expect(field('format').textContent).toContain('Moscow')
    expect(field('team').querySelectorAll('svg.lucide-user')).toHaveLength(4)
  })

  it('names the state in its table colour, with no pill, square or dot beside it', () => {
    const { container } = draw()
    const state = container.querySelector('[data-overlay-fact="state"] dd span') as HTMLElement
    expect(state.textContent).toBe(i18n.t('event:state.ACTIVE'))
    expect(state.className).toContain(EVENT_STATE_TEXT.ACTIVE)
    expect(container.querySelector('[data-event-state-sign], [data-event-color-mark]')).toBeNull()
    expect(container.querySelector('.bg-event-fill'), 'the date pill came back').toBeNull()
  })

  it('stands the cover a little taller than a strip', () => {
    const { container } = draw()
    const frame = container.querySelector('[data-overlay-cover] [data-catalog-cover]')
    expect(frame?.className, 'the cover went flat again').toContain('aspect-[5/2]')
  })

  it('ends with only the way to the full card, on the right, and no join button', () => {
    const { container } = renderWithProviders(
      <EventOverlayBody card={{ ...card, joined: false }} canOpenAdmin={false} />,
    )
    const actions = container.querySelector('[data-overlay-actions]') as HTMLElement
    expect(actions.className).toContain('justify-end')
    const controls = [...actions.querySelectorAll('a, button')]
    expect(controls.map((node) => node.textContent)).toEqual([i18n.t('event:overlay.openFull')])
    expect(controls[0]?.getAttribute('href')).toBe('/events/ev_1')
    expect(screen.queryByRole('button', { name: /take part|join/i })).toBeNull()
  })

  it('reads cover, description, then the facts, with the organiser left to the header', () => {
    const { container } = draw()
    const pick = (selector: string) => container.querySelector(selector) as HTMLElement
    const cover = pick('[data-overlay-cover]')
    const description = pick('[data-overlay-description]')
    const state = pick('[data-overlay-fact="state"]')
    const follows = (first: Node, second: Node) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(cover, description), 'the description fell below the cover').toBe(true)
    expect(follows(description, state), 'the facts came before the description').toBe(true)
    expect(screen.queryByText('Committee'), 'the organiser came back under the cover').toBeNull()
  })

  it('pins the format and the team to the right edge of the window', () => {
    const { container } = draw()
    for (const name of ['format', 'team']) {
      const cell = container.querySelector(`[data-overlay-fact="${name}"]`) as HTMLElement
      expect(cell.className, `${name} drifted off the right edge`).toContain('sm:col-start-3')
      expect(cell.className).toContain('sm:text-right')
      expect(cell.className).toContain('sm:items-end')
    }
  })
})
