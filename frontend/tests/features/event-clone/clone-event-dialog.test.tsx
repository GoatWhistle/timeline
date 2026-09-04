import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CloneEventDialog } from '@/features/event-clone/clone-event-dialog'
import type { EventResponse } from '@/shared/api/types.gen'

const event: EventResponse = {
  id: 'e1',
  title: 'National AI Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'RU',
  effective_format: 'ONLINE',
  start_at: '2026-10-01T09:00:00Z',
  end_at: '2026-10-20T18:00:00Z',
  state: 'UPCOMING',
  tracks: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

function open() {
  return renderWithProviders(<CloneEventDialog event={event} open onOpenChange={vi.fn()} />)
}

describe('CloneEventDialog', () => {
  it('suggests a distinct title so the copy is not confused with the source', () => {
    open()
    const title = screen.getByLabelText(/title/i) as HTMLInputElement
    expect(title.value).not.toBe(event.title)
    expect(title.value).toContain(event.title)
  })

  it('starts from the source start date, meaning no shift', async () => {
    open()
    const start = screen.getByLabelText(/start/i)
    expect(start.getAttribute('data-value')).toBe('2026-10-01')
    expect(await screen.findByText(/unchanged/i)).toBeInTheDocument()
  })

  it('reports the shift and the recomputed end date once a new start is chosen', async () => {
    const { user } = open()

    await user.click(screen.getByRole('button', { name: /open the calendar/i }))
    await user.click(await screen.findByRole('button', { name: /October 31, 2026/i }))

    const summary = await screen.findByText(/Shift by 30 days/i)
    expect(summary).toBeInTheDocument()
    expect(within(summary).getByText(/19 Nov|Nov 19|19\.11/)).toBeDefined()
  })

  it('copies the stages unless the administrator opts out', async () => {
    const { user } = open()
    const stages = screen.getByLabelText(/stages/i)
    expect(stages).toBeChecked()

    await user.click(stages)
    expect(stages).not.toBeChecked()
  })

  it('refuses to clone without a title', async () => {
    const { user } = open()
    await user.clear(screen.getByLabelText(/title/i))
    expect(screen.getByRole('button', { name: /^Clone$/ })).toBeDisabled()
  })
})
