import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePointerAnchor } from '@/features/schedule/ui/schedule-bar/use-pointer-anchor'

const HOST = { left: 100, top: 200 }
const BAR = { left: 100, top: 380, right: 1200, bottom: 440 }

function Harness() {
  const { anchorRef, onPointerMove } = usePointerAnchor()

  return (
    <div data-testid="host" style={{ position: 'relative' }}>
      <span ref={anchorRef} data-testid="anchor" />
      <button type="button" data-testid="bar" onPointerMove={onPointerMove}>
        bar
      </button>
    </div>
  )
}

function boxes(container: HTMLElement) {
  const host = container.querySelector('[data-testid="host"]') as HTMLElement
  const bar = container.querySelector('[data-testid="bar"]') as HTMLElement
  const anchor = container.querySelector('[data-testid="anchor"]') as HTMLElement

  host.getBoundingClientRect = () =>
    ({ left: HOST.left, top: HOST.top, right: 1400, bottom: 800 }) as DOMRect
  bar.getBoundingClientRect = () =>
    ({ left: BAR.left, top: BAR.top, right: BAR.right, bottom: BAR.bottom }) as DOMRect

  return { bar, anchor }
}

function hover(bar: HTMLElement, clientX: number, clientY: number) {
  const event = new Event('pointermove', { bubbles: true })
  Object.assign(event, { pointerType: 'mouse', clientX, clientY })
  act(() => {
    bar.dispatchEvent(event)
  })
}

describe('the hover card of a schedule bar stays out of the way of the bar', () => {
  it('follows the pointer across a bar that spans the screen', () => {
    const { container } = render(<Harness />)
    const { bar, anchor } = boxes(container)

    hover(bar, 300, 400)
    expect(anchor.style.left).toBe(`${300 - HOST.left}px`)

    hover(bar, 1100, 400)
    expect(anchor.style.left).toBe(`${1100 - HOST.left}px`)
  })

  it('rests on the top edge of the bar, so the card cannot land on top of the bar', () => {
    const { container } = render(<Harness />)
    const { bar, anchor } = boxes(container)

    hover(bar, 300, 430)

    expect(anchor.style.top).toBe(`${BAR.top - HOST.top}px`)
    expect(anchor.style.top).not.toBe(`${430 - HOST.top}px`)
  })

  it('keeps that top edge whatever height inside the bar the pointer is at', () => {
    const { container } = render(<Harness />)
    const { bar, anchor } = boxes(container)

    hover(bar, 300, 385)
    const high = anchor.style.top

    hover(bar, 300, 438)
    expect(anchor.style.top).toBe(high)
  })

  it('ignores a pointer that is not a mouse, so a touch does not move the card', () => {
    const { container } = render(<Harness />)
    const { bar, anchor } = boxes(container)

    const event = new Event('pointermove', { bubbles: true })
    Object.assign(event, { pointerType: 'touch', clientX: 300, clientY: 400 })
    act(() => {
      bar.dispatchEvent(event)
    })

    expect(anchor.style.left).toBe('')
    expect(anchor.style.top).toBe('')
  })
})
