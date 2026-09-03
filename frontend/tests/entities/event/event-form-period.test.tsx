import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { day, dayCells, EVENT, fixMoscowClock, goToStage, trigger } from './event-form.harness'

fixMoscowClock()

describe('the end calendar begins at the start date', () => {
  it('forbids an end before the chosen start', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-end'))
    expect(day('2026-04-30')).toHaveAttribute('aria-disabled', 'true')
    expect(day('2026-05-01')).toHaveAttribute('aria-disabled', 'false')
    expect(day('2026-05-02')).toHaveAttribute('aria-disabled', 'false')
  })

  it('forbids a start after the chosen end', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-start'))
    expect(day('2026-05-04')).toHaveAttribute('aria-disabled', 'true')
  })

  it('refuses a click on a day before the start', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-end'))
    await user.click(day('2026-04-28'))
    expect(trigger('event-end')).toHaveAttribute('data-value', '2026-05-03')
  })

  it('refuses to reach a day before the start with the arrow keys', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-end'))
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowLeft}{ArrowLeft}')
    const focusable = dayCells().filter((cell) => cell.tabIndex === 0)
    expect(focusable).toHaveLength(1)
    expect(focusable[0]?.dataset.date).toBe('2026-05-01')
    await user.keyboard('{Enter}')
    expect(trigger('event-end')).toHaveAttribute('data-value', '2026-05-01')
  })

  it('cannot land on a forbidden day with Home or PageUp either', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-end'))
    await user.keyboard('{PageUp}')
    expect(dayCells().find((cell) => cell.tabIndex === 0)?.dataset.date).toBe('2026-05-01')
    await user.keyboard('{Home}')
    expect(dayCells().find((cell) => cell.tabIndex === 0)?.dataset.date).toBe('2026-05-01')
  })

  it('states the rule through the calendar, not through a hint under the field', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    expect(document.getElementById('event-end-hint')).toBeNull()
    expect(trigger('event-end')).not.toHaveAttribute('aria-describedby')
  })

  it('highlights the days between the two ends', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    await user.click(trigger('event-start'))
    expect(day('2026-05-02')).toHaveAttribute('data-in-range', 'true')
    expect(day('2026-05-05')).not.toHaveAttribute('data-in-range')
  })
})

describe('the zone is stated on the form', () => {
  it('names the zone and its offset beside each moment', async () => {
    const { user } = renderWithProviders(
      <EventForm event={EVENT} submitLabel="Save" onSubmit={vi.fn()} />,
    )
    await goToStage(user, 'period')
    expect(screen.getByTestId('event-start-zone')).toHaveTextContent('Europe/Moscow')
    expect(screen.getByTestId('event-start-zone')).toHaveTextContent('GMT+3')
  })
})
