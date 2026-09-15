import { describe, expect, it } from 'vitest'
import {
  CROP_HANDLES,
  centredSquareIn,
  clampRectTo,
  clampSquareTo,
  EDITOR_TOOLS,
  MIN_CROP_SIDE,
  moveRectBy,
  resizeCropByHandle,
} from '@/features/profile/image-editor/editor-model'

describe('the crop frame is ready before the reader touches anything', () => {
  it('opens as the largest square a wide picture can hold, centred', () => {
    const rect = centredSquareIn(900, 400)
    expect(rect.width, 'a wide picture is limited by its height').toBe(400)
    expect(rect.height).toBe(400)
    expect(rect.x, 'the square must sit in the middle, not at the edge').toBe(250)
    expect(rect.y).toBe(0)
  })

  it('opens as the largest square a tall picture can hold, centred', () => {
    const rect = centredSquareIn(400, 900)
    expect(rect.width).toBe(400)
    expect(rect.y).toBe(250)
    expect(rect.x).toBe(0)
  })

  it('covers a square picture whole, leaving nothing cropped by default', () => {
    const rect = centredSquareIn(600, 600)
    expect(rect).toEqual({ x: 0, y: 0, width: 600, height: 600 })
  })
})

describe('every side of the frame can be taken, not only its corners', () => {
  it('offers a handle on each corner and each edge', () => {
    expect(CROP_HANDLES).toHaveLength(8)
    for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      expect(CROP_HANDLES, `the ${handle} handle is missing`).toContain(handle)
    }
  })

  it('keeps the frame square whichever handle is dragged', () => {
    const rect = { x: 100, y: 100, width: 200, height: 200 }

    for (const handle of CROP_HANDLES) {
      const resized = resizeCropByHandle(rect, handle, { x: 380, y: 260 })
      expect(resized.width, `the ${handle} handle broke the square`).toBe(resized.height)
    }
  })

  it('an edge handle grows the frame from its opposite side', () => {
    const rect = { x: 100, y: 100, width: 200, height: 200 }

    const east = resizeCropByHandle(rect, 'e', { x: 400, y: 999 })
    expect(east.x, 'the west side stays put when the east edge is dragged').toBe(100)
    expect(east.width, 'the frame reaches the pointer').toBe(300)
    expect(east.height, 'a round avatar needs a square frame').toBe(300)

    const north = resizeCropByHandle(rect, 'n', { x: 999, y: 40 })
    expect(north.y + north.height, 'the south side stays put').toBe(300)
    expect(north.width).toBe(north.height)
  })

  it('a corner handle keeps the opposite corner fixed', () => {
    const rect = { x: 100, y: 100, width: 200, height: 200 }
    const se = resizeCropByHandle(rect, 'se', { x: 350, y: 380 })
    expect(se.x, 'the north-west corner is the anchor').toBe(100)
    expect(se.y).toBe(100)
    expect(se.width, 'the longer reach wins, so the frame stays square').toBe(280)
    expect(se.height).toBe(280)
  })

  it('never shrinks below a usable size', () => {
    const rect = { x: 100, y: 100, width: 200, height: 200 }
    const tiny = resizeCropByHandle(rect, 'se', { x: 101, y: 101 })
    expect(tiny.width).toBeGreaterThanOrEqual(MIN_CROP_SIDE)
    expect(tiny.height).toBe(tiny.width)
  })
})

describe('a square picture opens with the frame over all of it', () => {
  it('covers the whole square, so nothing is cropped until the reader asks', () => {
    const rect = centredSquareIn(600, 600)
    expect(rect).toEqual({ x: 0, y: 0, width: 600, height: 600 })
  })

  it('still shrinks to a smaller square when a handle is pulled inward', () => {
    const full = centredSquareIn(600, 600)
    const pulled = clampSquareTo(resizeCropByHandle(full, 'se', { x: 400, y: 380 }), 600, 600)
    expect(pulled.width, 'pulling inward must shrink it').toBeLessThan(600)
    expect(pulled.width, 'and it must stay square').toBe(pulled.height)
  })
})

describe('the frame is square at every edge of the picture, never a rectangle', () => {
  it('stays square when carried past the left edge', () => {
    const squared = clampSquareTo(
      moveRectBy({ x: 10, y: 10, width: 80, height: 80 }, -999, 0),
      200,
      200,
    )
    expect(squared.width, 'clamping must not flatten the frame').toBe(squared.height)
    expect(squared.x).toBe(0)
  })

  it('stays square when carried past the bottom edge', () => {
    const squared = clampSquareTo(
      moveRectBy({ x: 10, y: 10, width: 80, height: 80 }, 0, 999),
      200,
      200,
    )
    expect(squared.width).toBe(squared.height)
    expect(squared.y + squared.height).toBeLessThanOrEqual(200)
  })

  it('shrinks to the shorter side rather than becoming a rectangle', () => {
    const squared = clampSquareTo({ x: 0, y: 0, width: 400, height: 400 }, 900, 300)
    expect(squared.width, 'a wide picture limits the square by its height').toBe(300)
    expect(squared.height).toBe(300)
  })
})

describe('the frame can be carried without being resized', () => {
  it('moves as one piece, keeping its size', () => {
    const moved = moveRectBy({ x: 10, y: 20, width: 100, height: 100 }, 15, -5)
    expect(moved).toEqual({ x: 25, y: 15, width: 100, height: 100 })
  })

  it('cannot be carried off the picture', () => {
    const moved = clampRectTo(
      moveRectBy({ x: 10, y: 10, width: 50, height: 50 }, -999, -999),
      200,
      200,
    )
    expect(moved.x).toBeGreaterThanOrEqual(0)
    expect(moved.y).toBeGreaterThanOrEqual(0)
  })
})

describe('only the hand tool carries the frame; the others draw inside it', () => {
  it('lists the hand before the pencil, so moving comes first', () => {
    expect(EDITOR_TOOLS[0], 'the hand must lead the row').toBe('crop')
    expect(EDITOR_TOOLS.indexOf('crop')).toBeLessThan(EDITOR_TOOLS.indexOf('brush'))
  })

  it('keeps every drawing tool in the row beside it', () => {
    for (const tool of ['brush', 'rectangle', 'ellipse', 'line', 'fill', 'text', 'picker']) {
      expect(EDITOR_TOOLS, `${tool} is missing from the toolbar`).toContain(tool)
    }
  })
})
