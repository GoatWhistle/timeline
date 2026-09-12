import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeZone } from '@/shared/datetime/datetime'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'

const TODAY = new Date('2026-05-13T09:00:00Z')

function Harness({ initial = '2026-05-13' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <DatePicker id="pick" value={value} onChange={setValue} />
}

function trigger(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
  if (!button) throw new Error('no calendar trigger')
  return button
}

function focusedCell(): HTMLElement | null {
  return document.querySelector<HTMLElement>('button[data-date][tabindex="0"]')
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(TODAY)
  setTimeZone('Europe/Moscow')
})

afterEach(() => {
  vi.useRealTimers()
  setTimeZone(undefined)
})

describe('the calendar panel earns focus only once it can actually receive it', () => {
  it('moves focus onto the selected day, not the first focusable child of the panel', async () => {
    const { user } = renderWithProviders(<Harness initial="2026-05-20" />)
    await user.click(trigger())

    const cell = focusedCell()
    expect(cell).not.toBeNull()
    expect(cell).toHaveAttribute('data-date', '2026-05-20')
    expect(cell).toHaveFocus()
  })

  it('does not fight the day cell for focus once it already holds it', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(trigger())

    const cell = focusedCell()
    expect(cell).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-14')
    expect(focusedCell()).toHaveFocus()
  })

  it('never steals focus away from elsewhere in the panel once it is already open', async () => {
    const { user, rerender } = renderWithProviders(<Harness initial="2026-05-20" />)
    await user.click(trigger())
    const nextMonth = screen.getByRole('button', { name: /next month/i })
    nextMonth.focus()
    expect(nextMonth).toHaveFocus()

    rerender(<Harness initial="2026-05-20" />)

    expect(nextMonth).toHaveFocus()
  })
})
