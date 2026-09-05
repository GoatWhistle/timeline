import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeZone } from '@/shared/datetime/datetime'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'

const TODAY = new Date('2026-05-13T09:00:00Z')

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <DatePicker id="pick" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </div>
  )
}

function field(): HTMLInputElement {
  const input = document.getElementById('pick')
  if (!(input instanceof HTMLInputElement)) throw new Error('no date field')
  return input
}

function trigger(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
  if (!button) throw new Error('no calendar button')
  return button
}

function dayCells(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button[data-date]'))
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

describe('someone who knows the date types it instead of hunting for it', () => {
  it('takes a date typed straight into the field, with no calendar opened', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('17.09.2026')

    expect(screen.getByTestId('value')).toHaveTextContent('2026-09-17')
    expect(document.querySelector('table')).toBeNull()
  })

  it('names the shape it wants, so the order of the parts is never a guess', () => {
    renderWithProviders(<Harness />)

    expect(field()).toHaveAttribute('placeholder', 'dd.mm.yyyy')
  })

  it('shows a date it was given in that same shape', () => {
    renderWithProviders(<Harness initial="2026-05-13" />)

    expect(field().value).toBe('13.05.2026')
    expect(field()).toHaveAttribute('data-value', '2026-05-13')
  })

  it('tidies a loosely typed date once the field is left', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('3/7/26')
    await user.tab()

    expect(screen.getByTestId('value')).toHaveTextContent('2026-07-03')
    expect(field().value).toBe('03.07.2026')
  })

  it('refuses to keep a day that cannot be a date, and leaves the typing to be corrected', async () => {
    const { user } = renderWithProviders(<Harness initial="2026-05-13" />)
    await user.clear(field())
    await user.keyboard('31.02.2026')
    await user.tab()

    expect(screen.getByTestId('value')).toHaveTextContent('')
    expect(field().value).toBe('31.02.2026')
  })

  it('lets an emptied field mean no date at all', async () => {
    const { user } = renderWithProviders(<Harness initial="2026-05-13" />)
    await user.clear(field())
    await user.tab()

    expect(screen.getByTestId('value')).toHaveTextContent('')
  })
})

describe('typing and pointing reach the very same day', () => {
  it('agrees whichever way the day was chosen', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('14.05.2026')
    const typed = screen.getByTestId('value').textContent

    await user.clear(field())
    await user.click(trigger())
    const cell = dayCells().find((day) => day.dataset.date === '2026-05-14')
    if (!cell) throw new Error('no such day in the grid')
    await user.click(cell)

    expect(typed).toBe('2026-05-14')
    expect(screen.getByTestId('value')).toHaveTextContent(typed)
  })

  it('writes a day picked in the calendar back into the field as text', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(trigger())
    const cell = dayCells().find((day) => day.dataset.date === '2026-05-14')
    if (!cell) throw new Error('no such day in the grid')
    await user.click(cell)

    expect(field().value).toBe('14.05.2026')
  })
})
