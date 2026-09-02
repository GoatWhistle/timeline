import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EventOverlayCard, type OverlayCard, useEventOverlay } from '@/features/event-overlay-card'
import { Button } from '@/shared/ui/primitives/button'

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Centred hackathon',
  organizer: 'Committee',
  description: 'A card that opens over the content',
  websiteUrl: 'https://example.com',
  coverUrl: '/api/v1/covers/a.png',
  color: { family: 'RU', slot: 4 },
  state: 'UPCOMING',
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-03T18:00:00Z',
  deadlineAt: null,
  status: null,
  stages: [],
  joined: true,
}

function Harness({ openerLabel }: { openerLabel: string }) {
  const { eventId, openEventCard } = useEventOverlay()
  const result = {
    card: eventId === card.id ? card : null,
    loading: false,
    stale: false,
    error: null,
    retry: () => {},
  }

  return (
    <div>
      <Button onClick={() => openEventCard(card.id)}>{openerLabel}</Button>
      <EventOverlayCard result={result} />
    </div>
  )
}

async function openFrom(openerLabel: string) {
  const rendered = renderWithProviders(<Harness openerLabel={openerLabel} />)
  const opener = screen.getByRole('button', { name: openerLabel })
  opener.focus()
  await rendered.user.click(opener)
  await screen.findByRole('dialog')
  return { ...rendered, opener }
}

describe('event overlay card', () => {
  it.each(['schedule strip', 'table row', 'tile'])(
    'opens the same card from the %s',
    async (label) => {
      await openFrom(label)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('data-event-overlay-card')
      expect(dialog.className).toContain('m-auto')
      expect(dialog.className).not.toContain('border-l')
      expect(screen.getByText('Centred hackathon')).toBeInTheDocument()
      expect(screen.getByText('A card that opens over the content')).toBeInTheDocument()
    },
  )

  it('carries the cover and the event colour into the card', async () => {
    await openFrom('tile')

    const cover = screen.getByRole('img')
    expect(cover).toHaveAttribute('src', '/api/v1/covers/a.png')

    const tinted = document.querySelector('[data-event-family="RU"][data-event-slot="4"]')
    expect(tinted).not.toBeNull()

    const scope = cover.closest('[data-event-family]')
    expect(scope, 'the cover sits inside the event colour scope').not.toBeNull()
    expect(scope).toHaveAttribute('data-event-slot', '4')

    const period = document.querySelector('.bg-event-fill')
    expect(period, 'the period is painted with the event fill').not.toBeNull()
    expect((period as Element).closest('[data-event-family]')).toBe(scope)
  })

  it('offers the way through to the full event page', async () => {
    await openFrom('table row')

    expect(screen.getByRole('link', { name: /full statistics/i })).toHaveAttribute(
      'href',
      '/events/ev_1',
    )
  })

  it('moves focus into the card and gives it back to the opener on Escape', async () => {
    const { user, opener } = await openFrom('schedule strip')

    expect(document.activeElement).not.toBe(opener)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('gives focus back to the opener when the backdrop is clicked', async () => {
    const { user, opener } = await openFrom('table row')

    const backdrop = document.querySelector('[data-event-overlay-backdrop]')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('restores focus to the tile that opened it, not to some other opener', async () => {
    const { user } = renderWithProviders(
      <div>
        <Harness openerLabel="tile" />
      </div>,
    )
    const tile = screen.getByRole('button', { name: 'tile' })
    tile.focus()
    await user.click(tile)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement).toBe(tile))
  })
})
