import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { day, EVENT, fixMoscowClock, trigger } from './event-form.harness'

fixMoscowClock()

describe('the period rule is visible in the calendar, not only after submitting', () => {
  it('forbids an end before the chosen start', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await user.click(trigger('event-end'))
    const before = day('2026-04-30')
    expect(before).toHaveAttribute('aria-disabled', 'true')
    const after = day('2026-05-02')
    expect(after).toHaveAttribute('aria-disabled', 'false')
  })

  it('forbids a start after the chosen end', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await user.click(trigger('event-start'))
    const past = day('2026-05-04')
    expect(past).toHaveAttribute('aria-disabled', 'true')
  })

  it('highlights the days between the two ends', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await user.click(trigger('event-start'))
    const middle = day('2026-05-02')
    expect(middle).toHaveAttribute('data-in-range', 'true')
    const outside = day('2026-05-05')
    expect(outside).not.toHaveAttribute('data-in-range')
  })
})

describe('the zone is stated on the form', () => {
  it('names the zone and its offset beside each moment', () => {
    renderWithProviders(<EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />)
    expect(screen.getByTestId('event-start-zone')).toHaveTextContent('Europe/Moscow')
    expect(screen.getByTestId('event-start-zone')).toHaveTextContent('GMT+3')
  })
})
