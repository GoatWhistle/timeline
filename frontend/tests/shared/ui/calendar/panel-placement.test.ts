import { describe, expect, it } from 'vitest'
import { PANEL_GAP, PANEL_PADDING, placePanel } from '@/shared/ui/forms/calendar/use-anchored-panel'

const PANEL = { width: 310, height: 346 }
const FIELD_HEIGHT = 36

function anchorAt(top: number, left: number) {
  return { top, bottom: top + FIELD_HEIGHT, left, right: left + 220 }
}

describe('the calendar opens where it fits, not always downwards', () => {
  it('hangs below the field when the room below is enough', () => {
    const at = placePanel(anchorAt(200, 400), PANEL, { width: 1440, height: 900 })

    expect(at.side).toBe('bottom')
    expect(at.top).toBe(236 + PANEL_GAP)
  })

  it('flips above the field when only the room above is enough', () => {
    const at = placePanel(anchorAt(600, 400), PANEL, { width: 1440, height: 900 })

    expect(at.side).toBe('top')
    expect(at.top).toBe(600 - PANEL_GAP - PANEL.height)
  })

  it('never lets the panel run off the bottom of a short window', () => {
    const viewport = { width: 1280, height: 520 }
    const at = placePanel(anchorAt(300, 400), PANEL, viewport)

    expect(at.top).toBeGreaterThanOrEqual(PANEL_PADDING)
    expect(at.top + PANEL.height).toBeLessThanOrEqual(viewport.height - PANEL_PADDING)
  })

  it('never lets the panel run off the top either, when neither side has room', () => {
    const viewport = { width: 1280, height: 380 }
    const at = placePanel(anchorAt(180, 400), PANEL, viewport)

    expect(at.top).toBeGreaterThanOrEqual(PANEL_PADDING)
  })
})

describe('the calendar stays inside the window sideways', () => {
  it('lines its left edge up with the field it belongs to', () => {
    const at = placePanel(anchorAt(200, 400), PANEL, { width: 1440, height: 900 })

    expect(at.left).toBe(400)
  })

  it('pulls back from the right edge instead of hanging over it', () => {
    const viewport = { width: 1440, height: 900 }
    const at = placePanel(anchorAt(200, 1300), PANEL, viewport)

    expect(at.left + PANEL.width).toBeLessThanOrEqual(viewport.width - PANEL_PADDING)
  })

  it('does not push past the left edge when the field sits at the very edge', () => {
    const at = placePanel(anchorAt(200, 0), PANEL, { width: 390, height: 844 })

    expect(at.left).toBeGreaterThanOrEqual(PANEL_PADDING)
  })

  it('keeps a narrow phone window free of sideways overflow', () => {
    const viewport = { width: 390, height: 844 }
    const at = placePanel(anchorAt(300, 24), { width: 366, height: 394 }, viewport)

    expect(at.left).toBeGreaterThanOrEqual(PANEL_PADDING)
    expect(at.left + 366).toBeLessThanOrEqual(viewport.width - PANEL_PADDING + 1)
  })
})
