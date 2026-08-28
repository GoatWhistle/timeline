import { describe, expect, it } from 'vitest'
import { LABEL_PADDING, placeBarLabel, spaceAfterOnLane } from '@/features/schedule/model/bar-label'
import { LABEL_OUTSIDE_GAP } from '@/features/schedule/model/schedule-scale'

describe('placeBarLabel', () => {
  it('centres a label that fits inside the bar', () => {
    const result = placeBarLabel({ left: 0, width: 200, textWidth: 40 })
    expect(result.placement).toBe('inside')
    expect(result.offset).toBeCloseTo((200 - 40) / 2)
  })

  it('pushes the label past the right edge when it no longer fits', () => {
    const result = placeBarLabel({ left: 0, width: 30, textWidth: 80 })
    expect(result.placement).toBe('outside')
    expect(result.offset).toBe(30 + LABEL_OUTSIDE_GAP)
  })

  it('uses exactly a five-pixel gap outside the bar', () => {
    expect(LABEL_OUTSIDE_GAP).toBe(5)
    expect(placeBarLabel({ left: 10, width: 12, textWidth: 200 }).offset).toBe(12 + 5)
  })

  it('switches to outside as soon as the padding no longer fits', () => {
    const width = 100
    const fits = placeBarLabel({ left: 0, width, textWidth: width - LABEL_PADDING * 2 })
    const overflows = placeBarLabel({ left: 0, width, textWidth: width - LABEL_PADDING * 2 + 1 })
    expect(fits.placement).toBe('inside')
    expect(overflows.placement).toBe('outside')
  })

  it('slides the label along a bar that runs off the left edge', () => {
    const centred = placeBarLabel({ left: 0, width: 400, textWidth: 40 })
    const clipped = placeBarLabel({ left: -300, width: 400, textWidth: 40 })
    expect(clipped.placement).toBe('inside')
    expect(clipped.offset).toBeGreaterThan(centred.offset)
  })

  it('slides the label along a bar that runs off the right edge', () => {
    const clipped = placeBarLabel({
      left: 0,
      width: 400,
      textWidth: 40,
      canvasWidth: 100,
    })
    expect(clipped.placement).toBe('inside')
    expect(clipped.offset).toBeGreaterThanOrEqual(LABEL_PADDING)
    expect(clipped.offset).toBeLessThan(100)
  })

  it('never lets the label leave the bar when it is placed inside', () => {
    for (const left of [-500, -100, 0, 50, 900]) {
      const result = placeBarLabel({ left, width: 400, textWidth: 40, canvasWidth: 1000 })
      if (result.placement !== 'inside') continue
      expect(result.offset).toBeGreaterThanOrEqual(LABEL_PADDING)
      expect(result.offset + 40).toBeLessThanOrEqual(400)
    }
  })

  it('hides an outside label that would collide with the next bar on the lane', () => {
    const result = placeBarLabel({ left: 0, width: 10, textWidth: 90, spaceAfter: 20 })
    expect(result.placement).toBe('hidden')
  })

  it('keeps the outside label when the lane has room for it', () => {
    const result = placeBarLabel({ left: 0, width: 10, textWidth: 90, spaceAfter: 200 })
    expect(result.placement).toBe('outside')
  })

  it('never hides a label that fits inside its own bar', () => {
    const result = placeBarLabel({ left: 0, width: 300, textWidth: 40, spaceAfter: 0 })
    expect(result.placement).toBe('inside')
  })

  it('keeps an empty label inside at zero', () => {
    expect(placeBarLabel({ left: 0, width: 10, textWidth: 0 })).toEqual({
      placement: 'inside',
      offset: 0,
    })
  })
})

describe('spaceAfterOnLane', () => {
  const placements = [
    { left: 0, width: 20, lane: 0 },
    { left: 100, width: 20, lane: 0 },
    { left: 30, width: 20, lane: 1 },
  ]

  it('measures the gap to the next bar sharing the lane', () => {
    expect(spaceAfterOnLane(0, 0, placements, 1000)).toBe(80)
  })

  it('ignores bars on other lanes', () => {
    expect(spaceAfterOnLane(2, 1, placements, 1000)).toBe(950)
  })

  it('reaches the canvas edge when nothing follows', () => {
    expect(spaceAfterOnLane(1, 0, placements, 500)).toBe(380)
  })

  it('never returns a negative gap', () => {
    const overlapping = [
      { left: 0, width: 200, lane: 0 },
      { left: 50, width: 20, lane: 0 },
    ]
    expect(spaceAfterOnLane(0, 0, overlapping, 100)).toBeGreaterThanOrEqual(0)
  })

  it('returns the canvas width for an index out of range', () => {
    expect(spaceAfterOnLane(9, 0, placements, 640)).toBe(640)
  })
})
