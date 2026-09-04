import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { CalendarPanel } from '@/shared/ui/forms/calendar/calendar-panel'

function renderPanel() {
  return renderWithProviders(
    <CalendarPanel
      value="2026-05-13"
      bounds={{}}
      range={null}
      open={true}
      onPick={() => {}}
      onClose={() => {}}
    />,
  )
}

function tabbableDays(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('td button')).filter(
    (button) => button.tabIndex === 0,
  )
}

describe('paging the calendar keeps a tab stop in the grid', () => {
  it('leaves exactly one tabbable day after paging several months forward', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(tabbableDays()).toHaveLength(1)

    const next = screen.getByRole('button', { name: /next month/i })
    await user.click(next)
    expect(tabbableDays()).toHaveLength(1)
    await user.click(next)
    expect(tabbableDays()).toHaveLength(1)
    await user.click(next)
    expect(tabbableDays()).toHaveLength(1)
  })

  it('leaves exactly one tabbable day after paging several months back', async () => {
    const user = userEvent.setup()
    renderPanel()

    const previous = screen.getByRole('button', { name: /previous month/i })
    await user.click(previous)
    await user.click(previous)
    await user.click(previous)

    expect(tabbableDays()).toHaveLength(1)
  })

  it('moves the tab stop into the month that is on screen', async () => {
    const user = userEvent.setup()
    renderPanel()

    const next = screen.getByRole('button', { name: /next month/i })
    await user.click(next)
    await user.click(next)

    const tabbable = tabbableDays()[0]
    expect(tabbable).toBeDefined()
    expect(tabbable?.getAttribute('aria-disabled')).not.toBe('true')
  })
})
