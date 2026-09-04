import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  EventOverlayCard,
  type OverlayCard,
  type OverlayResult,
  useEventOverlay,
} from '@/features/event-overlay-card'
import { i18n } from '@/shared/i18n/config'
import { Button } from '@/shared/ui/primitives/button'

const card: OverlayCard = {
  id: 'ev_1',
  title: 'Held hackathon',
  organizer: 'Committee',
  description: 'The body that must survive the closing animation',
  websiteUrl: null,
  coverUrl: null,
  color: null,
  state: 'UPCOMING',
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-03T18:00:00Z',
  deadlineAt: null,
  status: null,
  facts: {
    effectiveFormat: 'ONLINE',
    prizePool: null,
    prizeCurrency: null,
    teamSizeMin: undefined,
    teamSizeMax: undefined,
    tracks: [],
  },
  stages: [],
  joined: true,
}

function Harness() {
  const { eventId, openEventCard } = useEventOverlay()
  const result: OverlayResult = {
    card: eventId === card.id ? card : null,
    loading: false,
    stale: false,
    error: null,
    retry: () => {},
  }

  return (
    <div>
      <Button onClick={() => openEventCard(card.id)}>tile</Button>
      <EventOverlayCard result={result} />
    </div>
  )
}

describe('the event overlay while it is closing', () => {
  it('keeps the title it was showing instead of flashing the bare panel heading', async () => {
    const { user } = renderWithProviders(<Harness />)

    const opener = screen.getByRole('button', { name: 'tile' })
    opener.focus()
    await user.click(opener)
    await screen.findByRole('dialog')
    expect(screen.getByText('Held hackathon')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByText(i18n.t('event:overlay.title'))).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
