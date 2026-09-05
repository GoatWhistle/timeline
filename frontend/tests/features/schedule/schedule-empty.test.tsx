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

describe('an empty schedule offers the catalog once, then says nothing at all', () => {
  it('pitches the catalog the one time the account has nothing at all', () => {
    renderWithProviders(
      <ScheduleEmpty reason="invitation">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByRole('link', { name: /catalog/i })).toBeInTheDocument()
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

  it('states the account is bare on a year without pitching the catalog again', () => {
    renderWithProviders(
      <ScheduleEmpty reason="account">
        <Grid />
      </ScheduleEmpty>,
    )

    expect(screen.getByText('You have no assigned events yet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /catalog/i })).not.toBeInTheDocument()
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
