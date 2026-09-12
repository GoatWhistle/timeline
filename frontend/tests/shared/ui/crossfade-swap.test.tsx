import { act, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'

const LONG_TEXT = 'A considerably longer sentence than the one that replaces it'
const SHORT_TEXT = 'Short'

function Harness() {
  const [key, setKey] = useState<'long' | 'short'>('long')
  return (
    <div>
      <button type="button" onClick={() => setKey('short')}>
        switch
      </button>
      <CrossfadeSwap swapKey={key}>
        <p data-testid="pitch">{key === 'long' ? LONG_TEXT : SHORT_TEXT}</p>
      </CrossfadeSwap>
    </div>
  )
}

describe('CrossfadeSwap: text changes without the layout snapping', () => {
  it('shows only the current content once settled', () => {
    render(<Harness />)
    expect(screen.getAllByTestId('pitch')).toHaveLength(1)
    expect(screen.getByTestId('pitch')).toHaveTextContent(LONG_TEXT)
  })

  it('keeps the outgoing content mounted, faded, during the handoff', () => {
    render(<Harness />)
    act(() => {
      screen.getByRole('button', { name: 'switch' }).click()
    })
    const nodes = screen.getAllByTestId('pitch')
    expect(nodes).toHaveLength(2)
    const outgoing = nodes.find((node) => node.textContent === LONG_TEXT)
    const incoming = nodes.find((node) => node.textContent === SHORT_TEXT)
    expect(outgoing?.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(incoming?.parentElement).not.toHaveAttribute('aria-hidden')
  })

  it('drops the outgoing node once the exit finishes, leaving one in the DOM', async () => {
    render(<Harness />)
    act(() => {
      screen.getByRole('button', { name: 'switch' }).click()
    })
    expect(screen.getAllByTestId('pitch')).toHaveLength(2)

    await waitFor(() => expect(screen.getAllByTestId('pitch')).toHaveLength(1))

    expect(screen.getByTestId('pitch')).toHaveTextContent(SHORT_TEXT)
  })

  it('stacks both slots on the same grid cell so height follows the taller one, not a jump', () => {
    render(<Harness />)
    act(() => {
      screen.getByRole('button', { name: 'switch' }).click()
    })
    const nodes = screen.getAllByTestId('pitch')
    for (const node of nodes) {
      expect(node.parentElement).toHaveClass('[grid-area:1/1]')
    }
  })
})
