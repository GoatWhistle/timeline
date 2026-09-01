import { describe, expect, it } from 'vitest'
import { measureIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'

type Box = { top: number; left: number; width: number; height: number }

function element(box: Box, scroll = { top: 0, left: 0 }): HTMLElement {
  return {
    getBoundingClientRect: () => box,
    scrollTop: scroll.top,
    scrollLeft: scroll.left,
  } as unknown as HTMLElement
}

describe('measureIndicator', () => {
  it('reports nothing to draw when there is no active item', () => {
    const container = element({ top: 0, left: 0, width: 200, height: 400 })
    expect(measureIndicator(container, null, 'y')).toEqual({ offset: 0, size: 0, ready: false })
    expect(measureIndicator(null, container, 'y').ready).toBe(false)
  })

  it('measures a vertical item relative to its container', () => {
    const container = element({ top: 100, left: 0, width: 200, height: 400 })
    const active = element({ top: 172, left: 0, width: 200, height: 36 })
    expect(measureIndicator(container, active, 'y')).toEqual({ offset: 72, size: 36, ready: true })
  })

  it('measures a horizontal item relative to its container', () => {
    const container = element({ top: 0, left: 40, width: 300, height: 36 })
    const active = element({ top: 0, left: 157, width: 63, height: 28 })
    expect(measureIndicator(container, active, 'x')).toEqual({ offset: 117, size: 63, ready: true })
  })

  it('keeps the indicator aligned when the container is scrolled', () => {
    const container = element({ top: 0, left: 0, width: 200, height: 100 }, { top: 50, left: 0 })
    const active = element({ top: 20, left: 0, width: 200, height: 36 })
    expect(measureIndicator(container, active, 'y').offset).toBe(70)
  })

  it('treats a collapsed item as not ready rather than drawing a zero pill', () => {
    const container = element({ top: 0, left: 0, width: 200, height: 400 })
    const hidden = element({ top: 0, left: 0, width: 0, height: 0 })
    expect(measureIndicator(container, hidden, 'y').ready).toBe(false)
  })
})
