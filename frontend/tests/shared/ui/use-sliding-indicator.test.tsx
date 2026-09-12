import { act, render } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

function stubRect(node: HTMLElement | null, rect: Partial<DOMRect>) {
  if (!node) return
  node.getBoundingClientRect = () =>
    ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, ...rect }) as DOMRect
}

function PopoverLikeMenu({ open }: { open: boolean }) {
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>('b', 'y', open)

  if (!open) return null
  return (
    <div
      ref={(node) => {
        stubRect(node, { top: 0, height: 100, width: 120 })
        containerRef(node)
      }}
      data-testid="container"
    >
      <div data-indicator-item data-testid="item-a">
        a
      </div>
      <div
        ref={(node) => stubRect(node, { top: 30, height: 20, width: 120 })}
        data-indicator-item
        data-indicator-active="true"
        data-testid="item-b"
      >
        b
      </div>
      <div data-testid="box">{JSON.stringify(box)}</div>
    </div>
  )
}

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        toggle
      </button>
      <PopoverLikeMenu open={open} />
    </div>
  )
}

describe('useSlidingIndicator: the container can be a freshly-mounted node each time, as inside a Popover', () => {
  it('measures a real, non-hidden box the very first time the menu opens', () => {
    const { getByRole, getByTestId } = render(<Harness />)
    act(() => {
      getByRole('button', { name: 'toggle' }).click()
    })
    const box = JSON.parse(getByTestId('box').textContent ?? '{}')
    expect(box.ready).toBe(true)
  })

  it('keeps measuring correctly after the menu is closed and reopened with a fresh container node', () => {
    const { getByRole, getByTestId, queryByTestId } = render(<Harness />)

    act(() => {
      getByRole('button', { name: 'toggle' }).click()
    })
    expect(JSON.parse(getByTestId('box').textContent ?? '{}').ready).toBe(true)

    act(() => {
      getByRole('button', { name: 'toggle' }).click()
    })
    expect(queryByTestId('container')).toBeNull()

    act(() => {
      getByRole('button', { name: 'toggle' }).click()
    })
    const reopenedBox = JSON.parse(getByTestId('box').textContent ?? '{}')
    expect(reopenedBox.ready).toBe(true)
  })
})
