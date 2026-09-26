import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ScheduleEmpty } from '@/features/schedule/ui/schedule-empty/schedule-empty'

function Grid() {
  return (
    <table aria-label="calendar">
      <tbody>
        <tr>
          <td>1</td>
        </tr>
      </tbody>
    </table>
  )
}

describe('an empty schedule is just an empty calendar', () => {
  it('leaves even a brand-new account with just the empty calendar, no pitch above it', () => {
    const { container } = renderWithProviders(
      <ScheduleEmpty reason="invitation">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.queryByRole('link', { name: /catalog/i })).not.toBeInTheDocument()
    expect(container.querySelector('p'), 'a notice came back above the calendar').toBeNull()
    expect(container.querySelector('svg'), 'the empty figure came back').toBeNull()
  })

  it('drops the catalog pitch on every later empty period of the same session', () => {
    renderWithProviders(
      <ScheduleEmpty reason="period">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.queryByRole('link', { name: /catalog/i })).not.toBeInTheDocument()
  })

  it('spells out nothing over a bare period, leaving the empty grid to say it', () => {
    const { container } = renderWithProviders(
      <ScheduleEmpty reason="period">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('p')).toBeNull()
  })

  it('keeps the calendar on screen for a bare period rather than replacing it', () => {
    renderWithProviders(
      <ScheduleEmpty reason="period">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
  })

  it('marks the bare period on the frame, so the empty grid is styled on purpose', () => {
    const { container } = renderWithProviders(
      <ScheduleEmpty reason="period">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(container.querySelector('[data-schedule-empty="period"]')).not.toBeNull()
  })

  it('never covers the calendar with a floating panel, the way the old overlay did', () => {
    const { container } = renderWithProviders(
      <ScheduleEmpty reason="period">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(container.querySelector('.absolute')).toBeNull()
    expect(screen.getByRole('table', { name: 'calendar' }).closest('.opacity-45')).toBeNull()
  })

  it('says nothing at all on a bare account once the offer has been spent', () => {
    renderWithProviders(
      <ScheduleEmpty reason="account">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.queryByText('You have no assigned events yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /catalog/i })).not.toBeInTheDocument()
  })

  it('still draws the grid on a bare account instead of replacing the year with a notice', () => {
    renderWithProviders(
      <ScheduleEmpty reason="account">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
  })

  it('draws the grid for a brand-new account too, so no view is ever swapped out', () => {
    renderWithProviders(
      <ScheduleEmpty reason="invitation">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
  })

  it('adds nothing at all once the period has rows to show', () => {
    renderWithProviders(
      <ScheduleEmpty reason="none">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
