import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DRAG_SLOP, useRibbonDrag } from '@/features/schedule/model/ribbon/use-ribbon-drag'

function makeViewport(scrollWidth = 4000, clientWidth = 800) {
  const element = document.createElement('div')
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true })
  element.setPointerCapture = () => undefined
  element.releasePointerCapture = () => undefined
  element.hasPointerCapture = () => false
  element.scrollLeft = 1000
  document.body.append(element)
  return element
}

function pointer(type: string, clientX: number, init: PointerEventInit = {}) {
  return new PointerEvent(type, {
    clientX,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
    cancelable: true,
    ...init,
  })
}

function drag(element: HTMLElement, from: number, to: number) {
  element.dispatchEvent(pointer('pointerdown', from))
  element.dispatchEvent(pointer('pointermove', to))
}

describe('the ribbon follows a held mouse', () => {
  it('scrolls the opposite way to the hand, so content tracks the pointer', () => {
    const element = makeViewport()
    renderHook(() => useRibbonDrag({ current: element }))

    drag(element, 500, 300)

    expect(element.scrollLeft).toBe(1200)
  })

  it('ignores a twitch below the slop, so a click still lands on the bar', () => {
    const element = makeViewport()
    renderHook(() => useRibbonDrag({ current: element }))

    drag(element, 500, 500 - (DRAG_SLOP - 1))

    expect(element.scrollLeft).toBe(1000)
  })

  it('swallows the click that ends a real drag, so nothing opens by accident', () => {
    const element = makeViewport()
    renderHook(() => useRibbonDrag({ current: element }))
    let opened = false
    element.addEventListener('click', () => {
      opened = true
    })

    drag(element, 500, 300)
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(opened).toBe(false)
  })

  it('lets a click through when the pointer never travelled', () => {
    const element = makeViewport()
    renderHook(() => useRibbonDrag({ current: element }))
    let opened = false
    element.addEventListener('click', () => {
      opened = true
    })

    element.dispatchEvent(pointer('pointerdown', 500))
    element.dispatchEvent(pointer('pointerup', 500))
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(opened).toBe(true)
  })

  it('stays still when there is nothing to scroll', () => {
    const element = makeViewport(800, 800)
    renderHook(() => useRibbonDrag({ current: element }))

    drag(element, 500, 300)

    expect(element.scrollLeft).toBe(1000)
  })

  it('leaves a touch to the browser, which already pans it', () => {
    const element = makeViewport()
    renderHook(() => useRibbonDrag({ current: element }))

    element.dispatchEvent(pointer('pointerdown', 500, { pointerType: 'touch' }))
    element.dispatchEvent(pointer('pointermove', 300, { pointerType: 'touch' }))

    expect(element.scrollLeft).toBe(1000)
  })
})
