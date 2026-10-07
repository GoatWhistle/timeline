import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { EventCardPage } from '@/features/event-card/event-card'
import { i18n, i18nReady } from '@/shared/i18n/config'

const ID = 'ev_f93xdh8v9bax'

const catalogEvent = {
  id: ID,
  title: 'Harbour Voice Agents Hackathon',
  organizer: 'Harbour Institute',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'WORLD',
  effective_format: 'ONLINE',
  offline_stages: [],
  start_at: '2026-09-01T15:00:00Z',
  end_at: '2026-09-30T23:00:00Z',
  state: 'FINISHED',
  tracks: [],
  joined: false,
  color: { family: 'WORLD', slot: 8 },
  website_url: 'https://example.org/harbour',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function serve(card: number) {
  const calls: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(new URL(url, 'http://localhost').pathname)
    if (url.includes(`/events/${ID}`)) {
      return card === 200
        ? json(200, {})
        : json(404, { error: { code: 'not_found', message: 'you are not assigned to this event' } })
    }
    if (url.includes(`/catalog/${ID}`)) return json(200, catalogEvent)
    return json(404, { error: { code: 'not_found', message: 'not found' } })
  })
  return calls
}

function open() {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:id" element={<EventCardPage />} />
    </Routes>,
    { route: `/events/${ID}` },
  )
}

describe('an event the reader does not take part in still opens as a full card', () => {
  it('falls back to the catalog view of the event instead of a dead end', async () => {
    const calls = serve(404)
    open()
    expect(await screen.findByRole('heading', { name: catalogEvent.title })).toBeInTheDocument()
    expect(calls.some((path) => path.endsWith(`/catalog/${ID}`))).toBe(true)
    expect(
      document.querySelector('[data-catalog-event-view] [data-overlay-fact="state"]'),
    ).not.toBeNull()
  })

  it('sends the reader to teams to take part, with no join button of its own', async () => {
    serve(404)
    open()
    await screen.findByRole('heading', { name: catalogEvent.title })
    expect(screen.getByText(i18n.t('event:card.joinThroughTeam'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: i18n.t('event:card.toTeams') })).toHaveAttribute(
      'href',
      '/teams',
    )
    expect(screen.queryByRole('button', { name: /take part|join/i })).toBeNull()
  })

  it('keeps the arrow to the event site on the cover', async () => {
    serve(404)
    open()
    const site = await screen.findByRole('link', {
      name: i18n.t('event:catalog.card.websiteOf', { title: catalogEvent.title }),
    })
    expect(site).toHaveAttribute('href', 'https://example.org/harbour')
  })
})
