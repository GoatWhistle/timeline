import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTimeZone } from '@/shared/datetime/datetime'
import { DatePicker } from '@/shared/ui/forms/calendar/date-picker'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/overlays/dialog'

const TODAY = new Date('2026-05-13T09:00:00Z')

function Harness() {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState('2026-05-13')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>host dialog</DialogTitle>
        <DatePicker id="pick" value={value} onChange={setValue} />
      </DialogContent>
    </Dialog>
  )
}

function trigger(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
  if (!button) throw new Error('no calendar trigger')
  return button
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

describe('a calendar nested in a dialog keeps its own dismissal', () => {
  it('closes only the calendar on Escape, leaving the host dialog open', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(trigger())
    expect(document.querySelector('table')).not.toBeNull()

    await user.keyboard('{Escape}')

    expect(document.querySelector('table')).toBeNull()
    expect(screen.getByText('host dialog')).toBeInTheDocument()
  })

  it('is not clipped by the dialog: it renders through a portal, reachable by the pointer', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(trigger())

    const panel = document.getElementById('pick-calendar')
    expect(panel).not.toBeNull()
    expect(panel?.closest('[data-slot="dialog-content"]') ?? panel?.closest('body')).not.toBeNull()
  })

  it('returns focus to its own trigger, not to the dialog, once it closes', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(trigger())
    await user.keyboard('{Escape}')

    expect(trigger()).toHaveFocus()
  })
})

function field(): HTMLInputElement {
  const input = document.getElementById('pick')
  if (!(input instanceof HTMLInputElement)) throw new Error('no date field')
  return input
}

describe('a date can be typed, not only pointed at', () => {
  it('offers a real text field rather than a button that only opens a calendar', async () => {
    renderWithProviders(<Harness />)
    expect(field().tagName).toBe('INPUT')
    expect(field().type).toBe('text')
  })

  it('shows the expected shape in the field itself', async () => {
    renderWithProviders(<Harness />)
    expect(field()).toHaveAttribute('placeholder', 'dd.mm.yyyy')
  })

  it('keeps the calendar available as a button beside the field', async () => {
    renderWithProviders(<Harness />)
    expect(trigger().tagName).toBe('BUTTON')
    expect(field().tagName).toBe('INPUT')
    expect(
      field().compareDocumentPosition(trigger()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('settles what was typed when the field is left, not only while typing', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.clear(field())
    await user.type(field(), '3/7/26')
    expect(field().value).toBe('3/7/26')
    await user.tab()
    expect(field().value).toBe('03.07.2026')
    expect(field()).toHaveAttribute('data-value', '2026-07-03')
  })
})
