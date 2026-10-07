import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { OverlayTracks } from '@/features/event-overlay-card/overlay-facts'
import type { OverlayFacts } from '@/features/event-overlay-card/overlay-model'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const facts: OverlayFacts = {
  effectiveFormat: 'ONLINE',
  prizePool: '1200000',
  prizeCurrency: 'USD',
  teamSizeMin: 2,
  teamSizeMax: 5,
  place: null,
  tracks: [
    { id: 'tr_1', track_no: 1, name: 'Smart traffic lights', prize_total: '500000' },
    { id: 'tr_2', track_no: 2, name: 'Public transport routing', prize_total: '350000' },
    { id: 'tr_3', track_no: 3, name: 'Community choice', prize_total: '0' },
  ],
}

function draw(value: OverlayFacts = facts) {
  return renderWithProviders(<OverlayTracks facts={value} />)
}

describe('the tracks read as a small numbered table', () => {
  it('heads the list with the word alone, no count beside it', () => {
    const { container } = draw()
    const heading = container.querySelector('[data-overlay-tracks] h3') as HTMLElement
    expect(heading.textContent, 'a count came back beside the heading').toBe(
      i18n.t('event:place.tracks'),
    )
  })

  it('numbers each track, names it and sets its prize at the far end', () => {
    const { container } = draw()
    const rows = [...container.querySelectorAll('[data-overlay-track]')]
    expect(rows).toHaveLength(3)
    const cells = (row: Element) => [...row.children].map((cell) => cell.textContent)
    expect(cells(rows[0] as Element)).toEqual(['01', 'Smart traffic lights', '$500,000'])
    expect(cells(rows[1] as Element)).toEqual(['02', 'Public transport routing', '$350,000'])
  })

  it('draws a dash for a track with no prize instead of a zero', () => {
    const { container } = draw()
    const last = [...container.querySelectorAll('[data-overlay-track]')].at(-1) as Element
    expect(last.textContent).not.toContain('$0')
    expect(last.lastElementChild?.textContent).toContain('—')
  })

  it('sits the rows on one bordered surface, divided by hairlines', () => {
    const { container } = draw()
    const list = container.querySelector('[data-overlay-tracks] ul') as HTMLElement
    expect(list.className).toContain('rounded-control')
    expect(list.className).toContain('border')
    const row = container.querySelector('[data-overlay-track]') as HTMLElement
    expect(row.className).toContain('border-b')
    expect(row.className).toContain('last:border-b-0')
  })

  it('draws nothing when the event has no tracks', () => {
    const { container } = draw({ ...facts, tracks: [] })
    expect(container.querySelector('[data-overlay-tracks]')).toBeNull()
  })
})
