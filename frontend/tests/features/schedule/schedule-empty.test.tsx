import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ScheduleEmptyOverlay } from '@/features/schedule/ui/schedule-empty/schedule-empty'

function Grid() {
  return (
    <table aria-label="calendar">
      <tbody>
        <tr data-schedule-week="0" tabIndex={0}>
          <td>1</td>
        </tr>
        <tr data-schedule-week="1" tabIndex={-1}>
          <td>8</td>
        </tr>
      </tbody>
    </table>
  )
}

describe('an empty schedule still shows the calendar it is empty of', () => {
  it('keeps the grid on screen rather than replacing it with a message', () => {
    renderWithProviders(
      <ScheduleEmptyOverlay empty title="Nothing assigned">
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('says what is missing and why the grid is bare', () => {
    renderWithProviders(
      <ScheduleEmptyOverlay empty title="Nothing assigned" description="Join one to see it here">
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Nothing assigned')
    expect(screen.getByRole('status')).toHaveTextContent('Join one to see it here')
  })

  it('offers the way forward and leaves it clickable above the grid', async () => {
    let pressed = 0
    const { user } = renderWithProviders(
      <ScheduleEmptyOverlay
        empty
        title="Nothing assigned"
        action={
          <button type="button" onClick={() => pressed++}>
            Browse
          </button>
        }
      >
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    await user.click(screen.getByRole('button', { name: 'Browse' }))
    expect(pressed).toBe(1)
  })

  it('leaves the grid its single tab stop, so it is neither dead nor a trap', () => {
    const { container } = renderWithProviders(
      <ScheduleEmptyOverlay empty title="Nothing assigned">
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    const weeks = [...container.querySelectorAll('[data-schedule-week]')]
    expect(weeks).toHaveLength(2)
    expect(weeks.filter((week) => week.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('never hides the grid from assistive tech while it stays focusable', () => {
    const { container } = renderWithProviders(
      <ScheduleEmptyOverlay empty title="Nothing assigned">
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    const table = screen.getByRole('table', { name: 'calendar' })
    expect(table.closest('[aria-hidden="true"]')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"] [tabindex="0"]')).toBeNull()
  })

  it('adds nothing at all once the schedule has rows to show', () => {
    renderWithProviders(
      <ScheduleEmptyOverlay empty={false} title="Nothing assigned">
        <Grid />
      </ScheduleEmptyOverlay>,
    )

    expect(screen.getByRole('table', { name: 'calendar' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing assigned')).not.toBeInTheDocument()
  })
})
