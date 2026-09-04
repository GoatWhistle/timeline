import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeZone } from '@/shared/datetime/datetime'
import { i18n } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
import type { DayBounds } from '@/shared/ui/forms/calendar/month-grid'

const TODAY = new Date('2026-05-13T09:00:00Z')

function Harness({ initial = '2026-05-13', bounds }: { initial?: string; bounds?: DayBounds }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <button type="button">before</button>
      <DatePicker id="pick" value={value} bounds={bounds ?? {}} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </div>
  )
}

function field(): HTMLInputElement {
  const input = document.getElementById('pick')
  if (!(input instanceof HTMLInputElement)) throw new Error('no date field')
  return input
}

function open(): HTMLElement {
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
  if (!trigger) throw new Error('no trigger')
  return trigger
}

function dayCells(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button[data-date]'))
}

function focusedCell(): HTMLElement {
  const cells = dayCells()
  const found = cells.find((cell) => cell.getAttribute('tabindex') === '0')
  if (!found) throw new Error('no focused day')
  return found
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(TODAY)
  setTimeZone('Europe/Moscow')
})

const initialLanguage = i18n.language

afterEach(async () => {
  vi.useRealTimers()
  setTimeZone(undefined)
  await i18n.changeLanguage(initialLanguage)
})

describe('the field shows the current choice and takes a new one by hand', () => {
  it('shows the chosen day in the shape it is typed, not the machine one', () => {
    renderWithProviders(<Harness />)
    expect(field()).toHaveAttribute('data-value', '2026-05-13')
    expect(field().value).toBe('13.05.2026')
  })

  it('stands empty and names the shape it wants when nothing is chosen', () => {
    renderWithProviders(<Harness initial="" />)
    expect(field()).not.toHaveAttribute('data-value')
    expect(field().value).toBe('')
    expect(field()).toHaveAttribute('placeholder', 'dd.mm.yyyy')
  })

  it('reports its expanded state to assistive technology', async () => {
    const { user } = renderWithProviders(<Harness />)
    expect(open()).toHaveAttribute('aria-expanded', 'false')
    await user.click(open())
    expect(open()).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('the calendar is operated from the keyboard alone', () => {
  it('opens on the current value and focuses that day', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-13')
    expect(focusedCell()).toHaveFocus()
  })

  it('moves a day with the arrows and picks with Enter', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    await user.keyboard('{ArrowRight}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-14')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('value')).toHaveTextContent('2026-05-14')
  })

  it('moves a week with the vertical arrows', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    await user.keyboard('{ArrowDown}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-20')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-06')
  })

  it('moves a month with PageDown and PageUp', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    await user.keyboard('{PageDown}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-06-13')
    await user.keyboard('{PageUp}{PageUp}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-04-13')
  })

  it('jumps to the ends of the week with Home and End', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    await user.keyboard('{Home}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-11')
    await user.keyboard('{End}')
    expect(focusedCell()).toHaveAttribute('data-date', '2026-05-17')
  })

  it('closes on Escape and gives the focus back to the trigger', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    expect(document.querySelector('table')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(document.querySelector('table')).toBeNull()
    expect(open()).toHaveFocus()
  })

  it('gives the focus back after picking with the keyboard', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    await user.keyboard('{ArrowRight}{Enter}')
    expect(document.querySelector('table')).toBeNull()
    expect(field()).toHaveAttribute('data-value', '2026-05-14')
    expect(open()).toHaveFocus()
  })

  it('restores the focus only once the panel has left the document', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const panelPresentAtFocus: boolean[] = []
    open().addEventListener('focus', () => {
      panelPresentAtFocus.push(document.querySelector('table') !== null)
    })
    await user.keyboard('{Escape}')
    expect(open()).toHaveFocus()
    expect(panelPresentAtFocus).toEqual([false])
  })

  it('keeps exactly one day in the tab order', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const tabbable = dayCells().filter((cell) => cell.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
  })
})

describe('today, the choice and the forbidden days differ by more than colour', () => {
  it('marks today with aria-current and an underline, not only a tint', async () => {
    const { user } = renderWithProviders(<Harness initial="2026-05-20" />)
    await user.click(open())
    const today = dayCells().find((cell) => cell.dataset.today === 'true')
    expect(today).toHaveAttribute('data-date', '2026-05-13')
    expect(today).toHaveAttribute('aria-current', 'date')
    expect(today).toHaveAttribute('aria-pressed', 'false')
    expect(today?.className).toContain('underline')
  })

  it('still announces today when today is also the choice', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const today = dayCells().find((cell) => cell.dataset.today === 'true')
    expect(today).toHaveAttribute('aria-current', 'date')
    expect(today).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the chosen day with aria-selected and weight', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const selected = dayCells().filter((cell) => cell.getAttribute('aria-pressed') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.className).toContain('font-semibold')
  })

  it('marks a forbidden day with aria-disabled and a strike, not only a tint', async () => {
    const { user } = renderWithProviders(<Harness bounds={{ min: '2026-05-13' }} />)
    await user.click(open())
    const blocked = dayCells().find((cell) => cell.dataset.date === '2026-05-12')
    expect(blocked).toHaveAttribute('aria-disabled', 'true')
    expect(blocked?.className).toContain('line-through')
  })

  it('refuses a click on a forbidden day', async () => {
    const { user } = renderWithProviders(<Harness bounds={{ min: '2026-05-13' }} />)
    await user.click(open())
    const blocked = dayCells().find((cell) => cell.dataset.date === '2026-05-12')
    if (blocked) await user.click(blocked)
    expect(screen.getByTestId('value')).toHaveTextContent('2026-05-13')
  })
})

describe('the week starts on Monday in both languages', () => {
  it.each(LOCALES)('puts Monday first and Sunday last in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const headers = Array.from(document.querySelectorAll<HTMLElement>('th[scope="col"]'))
    expect(headers).toHaveLength(7)
    const named = (weekday: number) =>
      new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2024, 0, weekday)),
      )
    expect(headers[0]).toHaveTextContent(named(1))
    expect(headers[6]).toHaveTextContent(named(7))
  })

  it.each(LOCALES)('lays the month out left to right in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const { user } = renderWithProviders(<Harness />)
    await user.click(open())
    const cells = dayCells()
    expect(cells).toHaveLength(42)
    expect(cells[0]?.dataset.date).toBe('2026-04-27')
    expect(cells[41]?.dataset.date).toBe('2026-06-07')
  })
})
