import { describe, expect, it } from 'vitest'
import {
  clampRectTo,
  fitWithin,
  isUsableCrop,
  isValidHexColour,
  MAX_EDIT_DIMENSION,
  normaliseHexColour,
  normaliseRect,
  toHex,
  toRgba,
} from '@/features/profile/image-editor/editor-model'
import { floodFill, pixelAt } from '@/features/profile/image-editor/flood-fill'
import {
  emptyHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from '@/features/profile/image-editor/history-stack'

describe('crop geometry', () => {
  it('normalises a rectangle dragged in any direction', () => {
    const upLeft = normaliseRect({ x: 40, y: 30 }, { x: 10, y: 5 })
    expect(upLeft).toEqual({ x: 10, y: 5, width: 30, height: 25 })

    const downRight = normaliseRect({ x: 10, y: 5 }, { x: 40, y: 30 })
    expect(downRight).toEqual(upLeft)
  })

  it('keeps a crop inside the canvas even when the pointer leaves it', () => {
    const clamped = clampRectTo({ x: -20, y: -10, width: 400, height: 400 }, 100, 50)
    expect(clamped).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('rejects a crop with no area, which would produce an empty image', () => {
    expect(isUsableCrop({ x: 0, y: 0, width: 0, height: 10 })).toBe(false)
    expect(isUsableCrop({ x: 0, y: 0, width: 10, height: 0 })).toBe(false)
    expect(isUsableCrop({ x: 0, y: 0, width: 1, height: 1 })).toBe(true)
  })
})

describe('downscaling before editing', () => {
  it('leaves an already small image untouched', () => {
    expect(fitWithin(320, 200, MAX_EDIT_DIMENSION)).toEqual([320, 200])
  })

  it('scales the longest side down to the limit and keeps the aspect ratio', () => {
    const [width, height] = fitWithin(4000, 2000, 1000)
    expect(width).toBe(1000)
    expect(height).toBe(500)
  })

  it('never collapses a very thin image to zero', () => {
    const [width, height] = fitWithin(5000, 1, 1000)
    expect(width).toBe(1000)
    expect(height).toBeGreaterThanOrEqual(1)
  })
})

describe('colour conversion', () => {
  it('round-trips a hex colour through rgba', () => {
    const [r, g, b, a] = toRgba('#3b82f6')
    expect([r, g, b, a]).toEqual([59, 130, 246, 255])
    expect(toHex(r, g, b)).toBe('#3b82f6')
  })

  it('expands the short hex form', () => {
    expect(toRgba('#fff')).toEqual([255, 255, 255, 255])
  })
})

describe('custom colour code entry', () => {
  it('accepts a full and a short hex code', () => {
    expect(isValidHexColour('#3b82f6')).toBe(true)
    expect(isValidHexColour('#fff')).toBe(true)
  })

  it('rejects anything that is not a hex colour', () => {
    expect(isValidHexColour('3b82f6')).toBe(false)
    expect(isValidHexColour('red')).toBe(false)
    expect(isValidHexColour('#ggg')).toBe(false)
    expect(isValidHexColour('')).toBe(false)
  })

  it('normalises a valid code, trimming and expanding the short form', () => {
    expect(normaliseHexColour('  #FFF  ')).toBe('#ffffff')
    expect(normaliseHexColour('#3B82F6')).toBe('#3b82f6')
  })

  it('rejects an invalid code instead of guessing a colour', () => {
    expect(normaliseHexColour('not-a-colour')).toBeNull()
  })
})

function canvasData(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return data
}

describe('flood fill', () => {
  it('fills a uniform region and reports the change', () => {
    const data = canvasData(4, 4, [255, 255, 255, 255])
    expect(floodFill(data, 4, 4, 0, 0, '#ff0000')).toBe(true)
    expect(pixelAt(data, 4, 3, 3)).toEqual([255, 0, 0, 255])
  })

  it('stops at a boundary of a different colour', () => {
    const width = 3
    const height = 1
    const data = canvasData(width, height, [255, 255, 255, 255])
    data[4] = 0
    data[5] = 0
    data[6] = 0

    expect(floodFill(data, width, height, 0, 0, '#ff0000')).toBe(true)
    expect(pixelAt(data, width, 0, 0)).toEqual([255, 0, 0, 255])
    expect(pixelAt(data, width, 1, 0)).toEqual([0, 0, 0, 255])
    expect(pixelAt(data, width, 2, 0)).toEqual([255, 255, 255, 255])
  })

  it('does nothing when the target already has the fill colour', () => {
    const data = canvasData(2, 2, [255, 0, 0, 255])
    expect(floodFill(data, 2, 2, 0, 0, '#ff0000')).toBe(false)
  })

  it('does not bleed across a smooth gradient into a square block', () => {
    const width = 900
    const height = 8
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        data[offset] = Math.round((255 * x) / width)
        data[offset + 1] = 40
        data[offset + 2] = 90
        data[offset + 3] = 255
      }
    }

    floodFill(data, width, height, 0, 0, '#ff0000')

    const filled = []
    for (let x = 0; x < width; x += 1) {
      if (pixelAt(data, width, x, 0)[0] === 255 && pixelAt(data, width, x, 0)[1] === 0)
        filled.push(x)
    }
    expect(
      filled.length,
      'a wide tolerance paints a rectangle of its own instead of a region',
    ).toBeLessThan(40)
  })

  it('ignores a click outside the canvas instead of throwing', () => {
    const data = canvasData(2, 2, [255, 255, 255, 255])
    expect(floodFill(data, 2, 2, -1, 0, '#ff0000')).toBe(false)
    expect(floodFill(data, 2, 2, 2, 0, '#ff0000')).toBe(false)
  })
})

describe('undo/redo history', () => {
  it('clears the redo stack on a new edit, so a stale future is never replayed', () => {
    let history = emptyHistory<string>()
    history = pushHistory(history, 'a', 20)
    const afterUndo = undoHistory(history, 'b', 20)
    expect(afterUndo?.history.redoStack).toEqual(['b'])

    const afterAnotherEdit = pushHistory(afterUndo?.history ?? emptyHistory(), 'c', 20)
    expect(afterAnotherEdit.redoStack).toEqual([])
  })

  it('moves the current state onto redo and restores the previous one on undo', () => {
    let history = emptyHistory<string>()
    history = pushHistory(history, 'a', 20)
    const outcome = undoHistory(history, 'b', 20)
    expect(outcome?.restored).toBe('a')
    expect(outcome?.history.redoStack).toEqual(['b'])
    expect(outcome?.history.undoStack).toEqual([])
  })

  it('does nothing when there is nothing to undo', () => {
    expect(undoHistory(emptyHistory<string>(), 'a', 20)).toBeNull()
  })

  it('restores what undo put aside when redo is called next', () => {
    let history = emptyHistory<string>()
    history = pushHistory(history, 'a', 20)
    const undone = undoHistory(history, 'b', 20)
    const redone = redoHistory(undone?.history ?? emptyHistory(), 'a', 20)
    expect(redone?.restored).toBe('b')
    expect(redone?.history.undoStack).toEqual(['a'])
    expect(redone?.history.redoStack).toEqual([])
  })

  it('does nothing when there is nothing to redo', () => {
    expect(redoHistory(emptyHistory<string>(), 'a', 20)).toBeNull()
  })

  it('never grows the undo stack past the limit', () => {
    let history = emptyHistory<number>()
    for (let i = 0; i < 25; i += 1) history = pushHistory(history, i, 20)
    expect(history.undoStack).toHaveLength(20)
    expect(history.undoStack[0]).toBe(5)
  })
})
