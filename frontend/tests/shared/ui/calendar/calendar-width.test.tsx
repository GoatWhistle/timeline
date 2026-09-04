import type { UserEvent } from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeZone } from '@/shared/datetime/datetime'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'

const TODAY = new Date('2026-05-13T09:00:00Z')

function Harness() {
  const [value, setValue] = useState('2026-05-13')
  return <DatePicker id="pick" value={value} onChange={setValue} />
}

async function openPanel(user: UserEvent): Promise<void> {
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
  if (!trigger) throw new Error('no trigger')
  await user.click(trigger)
}

function grid(): HTMLTableElement {
  const table = document.querySelector('table')
  if (!table) throw new Error('the calendar grid is missing')
  return table
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(TODAY)
  setTimeZone('Europe/Moscow')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the calendar stays as narrow as its seven columns', () => {
  async function render() {
    const view = renderWithProviders(<Harness />)
    await openPanel(view.user)
    return view
  }

  it('opens a panel holding one column per weekday', async () => {
    await render()
    expect(grid().querySelectorAll('th')).toHaveLength(7)
  })

  it('lays the columns out fixed, so they cannot stretch past their content', async () => {
    await render()
    expect(grid().className).toContain('table-fixed')
  })

  it('pins every weekday heading to the width of a day cell', async () => {
    await render()
    const heads = [...grid().querySelectorAll('th')]
    expect(heads).toHaveLength(7)
    for (const head of heads) expect(head.className).toContain('w-9')
  })

  it('shows no keyboard hint on the visible surface of the panel', async () => {
    await render()
    const carrying = [...document.querySelectorAll('[role="dialog"] *')].filter(
      (node) => node.children.length === 0 && (node.textContent ?? '').includes('PageUp'),
    )
    expect(carrying.length).toBeGreaterThan(0)
    for (const node of carrying) {
      expect(node.closest('.sr-only'), node.tagName).not.toBeNull()
    }
  })

  it('still tells a screen reader how the grid is driven', async () => {
    await render()
    const described = grid().getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const help = document.getElementById(described ?? '')
    expect(help?.className).toContain('sr-only')
    expect(help?.textContent ?? '').toMatch(/PageUp/)
  })

  it('still reaches the last weekday column, the one a clipped panel loses first', async () => {
    await render()
    const heads = [...grid().querySelectorAll('th')]
    const last = heads[heads.length - 1]
    expect(last?.getAttribute('abbr')?.length ?? 0).toBeGreaterThan(0)
    expect(last?.textContent?.trim().length ?? 0).toBeGreaterThan(0)
  })
})
