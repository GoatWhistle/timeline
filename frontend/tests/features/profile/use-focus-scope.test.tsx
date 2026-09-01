import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useFocusScope } from '@/features/profile/image-editor/use-focus-scope'

function Scope({ onEscape }: { onEscape: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useFocusScope(ref, onEscape)
  return (
    <div ref={ref}>
      <button type="button">first</button>
      <button type="button">second</button>
      <button type="button">last</button>
    </div>
  )
}

function Harness({ open, onEscape }: { open: boolean; onEscape: () => void }) {
  return (
    <>
      <button type="button">outside</button>
      {open ? <Scope onEscape={onEscape} /> : null}
    </>
  )
}

describe('the overlay keeps focus while it is open', () => {
  it('moves focus into the overlay as soon as it opens', () => {
    render(<Harness open onEscape={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })

  it('closes on Escape so it never traps the user', () => {
    const onEscape = vi.fn()
    render(<Harness open onEscape={onEscape} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('keeps Escape from reaching the dialog underneath, which would close both at once', () => {
    const underneath = vi.fn()
    render(<Harness open onEscape={vi.fn()} />)
    window.addEventListener('keydown', underneath, true)
    try {
      fireEvent.keyDown(screen.getByRole('button', { name: 'first' }), { key: 'Escape' })
      expect(underneath).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', underneath, true)
    }
  })

  it('wraps Tab from the last control back to the first', () => {
    render(<Harness open onEscape={vi.fn()} />)
    const last = screen.getByRole('button', { name: 'last' })
    last.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })

  it('wraps Shift+Tab from the first control to the last', () => {
    render(<Harness open onEscape={vi.fn()} />)
    screen.getByRole('button', { name: 'first' }).focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(screen.getByRole('button', { name: 'last' })).toHaveFocus()
  })

  it('pulls focus back when it lands on the dialog underneath', () => {
    render(<Harness open onEscape={vi.fn()} />)
    const outside = screen.getByRole('button', { name: 'outside' })

    fireEvent.focusIn(outside, { target: outside })

    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })

  it('returns focus to where it came from once the overlay closes', () => {
    const { rerender } = render(<Harness open={false} onEscape={vi.fn()} />)
    const outside = screen.getByRole('button', { name: 'outside' })
    outside.focus()

    rerender(<Harness open onEscape={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()

    rerender(<Harness open={false} onEscape={vi.fn()} />)
    expect(outside).toHaveFocus()
  })
})
