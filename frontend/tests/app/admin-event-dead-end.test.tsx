import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminEventPage } from '@/app/pages/admin-event-page'

function respondWith(status: number, body: unknown) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(JSON.stringify({ error: body }), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )
}

async function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/events/:id" element={<AdminEventPage />} />
    </Routes>,
    { route: `/admin/events/${id}` },
  )
}

beforeEach(() => {
  respondWith(400, {
    code: 'validation_error',
    message: 'event identifier must start with "ev_"',
    request_id: 'req-1234',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a malformed event address is a wrong turn, not a dead end', () => {
  it('offers a way back to the event list rather than only a request id', async () => {
    await renderAt('new')

    const exit = await screen.findByRole('link', { name: /event/i })
    expect(exit).toHaveAttribute('href', '/admin/events')
  })

  it('still names the failure, so the request id remains reportable', async () => {
    await renderAt('new')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/req-1234/)).toBeInTheDocument()
  })

  it('gives the same exit when the event is simply gone', async () => {
    respondWith(404, { code: 'not_found', message: 'event not found' })
    await renderAt('ev_gma9hq8a96q5')

    const exit = await screen.findByRole('link', { name: /event/i })
    expect(exit).toHaveAttribute('href', '/admin/events')
  })
})
