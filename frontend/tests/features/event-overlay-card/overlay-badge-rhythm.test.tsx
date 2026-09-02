import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EventOverlayBody } from '@/features/event-overlay-card/event-overlay-body'
import type { OverlayCard } from '@/features/event-overlay-card/overlay-model'

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Centred hackathon',
  organizer: 'Committee',
  description: 'A card that opens over the content',
  websiteUrl: 'https://example.com',
  coverUrl: null,
  color: { family: 'RU', slot: 4 },
  state: 'UPCOMING',
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-03T18:00:00Z',
  deadlineAt: null,
  status: null,
  stages: [],
  joined: true,
}

const TYPE_SIZE = /^text-(screen|heading|copy|meta|caption|label)$/

function headerPills(container: HTMLElement): HTMLElement[] {
  const row = container.querySelector<HTMLElement>('.flex.flex-wrap.items-center.gap-2')
  if (!row) throw new Error('the card header row is missing')
  return [...row.children].filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement &&
      node.tagName === 'SPAN' &&
      node.className.split(/\s+/).some((token) => token.startsWith('px-')),
  )
}

function typeSizeOf(node: HTMLElement): string | undefined {
  return node.className.split(/\s+/).find((token) => TYPE_SIZE.test(token))
}

describe('the pills in the card header keep one rhythm', () => {
  function renderBody() {
    return renderWithProviders(<EventOverlayBody card={card} isAdmin={false} />)
  }

  it('shows the state and the dates side by side', () => {
    const pills = headerPills(renderBody().container)
    expect(pills.length).toBeGreaterThanOrEqual(2)
  })

  it('sets every pill on the same step of the type scale', () => {
    const sizes = headerPills(renderBody().container).map(typeSizeOf).filter(Boolean)
    expect(sizes.length).toBeGreaterThanOrEqual(2)
    expect(new Set(sizes).size).toBe(1)
  })

  it('builds the date pill from the badge primitive, so it cannot drift again', () => {
    const pills = headerPills(renderBody().container)
    const dates = pills.at(-1)
    expect(dates?.className).toContain('inline-flex')
    expect(dates?.className).toContain('rounded-control')
    expect(typeSizeOf(dates as HTMLElement)).toBe('text-caption')
  })

  it('gives the pills one padding and one radius', () => {
    const pills = headerPills(renderBody().container)
    const shape = pills.map((pill) =>
      pill.className
        .split(/\s+/)
        .filter((token) => token.startsWith('px-') || token.startsWith('py-'))
        .sort()
        .join(' '),
    )
    expect(new Set(shape).size).toBe(1)
  })
})
