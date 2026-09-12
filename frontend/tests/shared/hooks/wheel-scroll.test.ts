import { describe, expect, it } from 'vitest'
import { applyWheel, canScrollBy } from '@/shared/hooks/use-wheel-scroll/use-wheel-scroll'

function listOf({
  scrollHeight,
  clientHeight,
  scrollTop,
}: {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
  element.scrollTop = scrollTop
  return element
}

function wheelOf(deltaY: number): WheelEvent {
  return new WheelEvent('wheel', { deltaY, cancelable: true })
}

describe('applyWheel', () => {
  it('scrolls the list itself, because an outer scroll lock cancels the wheel after us', () => {
    const list = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 0 })
    const event = wheelOf(120)
    expect(applyWheel(list, event)).toBe(true)
    expect(list.scrollTop).toBe(120)
    expect(event.defaultPrevented).toBe(true)
  })

  it('scrolls upwards while there is room above', () => {
    const list = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 500 })
    expect(applyWheel(list, wheelOf(-120))).toBe(true)
    expect(list.scrollTop).toBe(380)
  })

  it('releases the wheel at the bottom edge instead of trapping the page', () => {
    const list = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 1800 })
    const event = wheelOf(120)
    expect(applyWheel(list, event)).toBe(false)
    expect(list.scrollTop).toBe(1800)
    expect(event.defaultPrevented).toBe(false)
  })

  it('releases the wheel at the top edge instead of trapping the page', () => {
    const list = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 0 })
    const event = wheelOf(-120)
    expect(applyWheel(list, event)).toBe(false)
    expect(list.scrollTop).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  it('releases the wheel when the list does not overflow at all', () => {
    const short = listOf({ scrollHeight: 200, clientHeight: 200, scrollTop: 0 })
    const event = wheelOf(120)
    expect(applyWheel(short, event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores a horizontal wheel that carries no vertical movement', () => {
    const list = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 100 })
    const event = wheelOf(0)
    expect(applyWheel(list, event)).toBe(false)
    expect(list.scrollTop).toBe(100)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('canScrollBy', () => {
  it('reports room in the direction asked, not merely that the list overflows', () => {
    const atBottom = listOf({ scrollHeight: 2000, clientHeight: 200, scrollTop: 1800 })
    expect(canScrollBy(atBottom, 120)).toBe(false)
    expect(canScrollBy(atBottom, -120)).toBe(true)
  })

  it('reports no room in either direction when the list does not overflow', () => {
    const short = listOf({ scrollHeight: 200, clientHeight: 200, scrollTop: 0 })
    expect(canScrollBy(short, 120)).toBe(false)
    expect(canScrollBy(short, -120)).toBe(false)
  })
})
