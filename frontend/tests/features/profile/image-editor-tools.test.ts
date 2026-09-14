import { describe, expect, it } from 'vitest'
import { drawText, resolveColourToken } from '@/features/profile/image-editor/canvas-ops'
import {
  EDITOR_PALETTE,
  EDITOR_PALETTE_FALLBACK_HEX,
  isValidHexColour,
  resizeCropByHandle,
} from '@/features/profile/image-editor/editor-model'

describe('resizing an existing crop from a corner handle', () => {
  const rect = { x: 10, y: 10, width: 20, height: 20 }

  it('dragging the south-east handle keeps the opposite corner fixed', () => {
    const resized = resizeCropByHandle(rect, 'se', { x: 40, y: 50 })
    expect(resized, 'the frame stays square, taking the longer reach').toEqual({
      x: 10,
      y: 10,
      width: 40,
      height: 40,
    })
  })

  it('dragging the north-west handle keeps the bottom-right corner fixed', () => {
    const resized = resizeCropByHandle(rect, 'nw', { x: 5, y: 0 })
    expect(resized).toEqual({ x: 0, y: 0, width: 30, height: 30 })
  })

  it('dragging past the opposite corner still produces a normalised rectangle', () => {
    const resized = resizeCropByHandle(rect, 'se', { x: 0, y: 0 })
    expect(resized.width).toBeGreaterThanOrEqual(0)
    expect(resized.height).toBeGreaterThanOrEqual(0)
  })
})

describe('editor palette', () => {
  it('every swatch is a token reference, never a raw hex literal', () => {
    for (const swatch of EDITOR_PALETTE) {
      expect(swatch.token.startsWith('var(--')).toBe(true)
      expect(swatch.token).not.toMatch(/#[0-9a-fA-F]{3,6}/)
    }
  })

  it('resolving a token in an environment without real computed colour falls back safely', () => {
    const resolved = resolveColourToken('var(--hue-blue-500)')
    expect(isValidHexColour(resolved)).toBe(true)
  })

  it('resolving an unknown token falls back to the documented default', () => {
    expect(resolveColourToken('not-a-token')).toBe(EDITOR_PALETTE_FALLBACK_HEX)
  })
})

describe('text tool drawing', () => {
  function fakeContext() {
    const calls: string[] = []
    return {
      calls,
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillText(text: string, x: number, y: number) {
        calls.push(`${text}@${x},${y}`)
      },
    }
  }

  it('sets the requested colour and a font built from the requested size', () => {
    const ctx = fakeContext()
    drawText(ctx as unknown as CanvasRenderingContext2D, { x: 3, y: 4 }, 'hi', '#ff0000', 32)
    expect(ctx.fillStyle).toBe('#ff0000')
    expect(ctx.font).toBe('32px sans-serif')
  })

  it('draws each line of multi-line text at an increasing vertical offset', () => {
    const ctx = fakeContext()
    drawText(ctx as unknown as CanvasRenderingContext2D, { x: 0, y: 0 }, 'a\nb', '#000000', 10)
    expect(ctx.calls).toEqual(['a@0,0', 'b@0,12'])
  })
})
