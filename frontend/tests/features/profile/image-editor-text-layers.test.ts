import { describe, expect, it } from 'vitest'
import {
  dropLayer,
  layerAt,
  layerBounds,
  moveLayer,
  newTextLayer,
  replaceLayer,
  type TextLayer,
  withoutEmpty,
} from '@/features/profile/image-editor/text-layers'

const measure = (text: string, size: number) => text.length * size * 0.6

function layer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: 'text-1',
    x: 100,
    y: 100,
    text: 'Hello',
    colour: '#ffffff',
    size: 24,
    ...overrides,
  }
}

describe('a text stays an object until the picture is saved', () => {
  it('starts empty, so the reader types into it rather than past it', () => {
    const made = newTextLayer({ x: 10, y: 20 }, '#ff0000', 32)
    expect(made.text).toBe('')
    expect(made.x).toBe(10)
    expect(made.y).toBe(20)
    expect(made.colour).toBe('#ff0000')
    expect(made.size).toBe(32)
  })

  it('gives every text its own identity, so two of them never collide', () => {
    const first = newTextLayer({ x: 0, y: 0 }, '#fff', 24)
    const second = newTextLayer({ x: 0, y: 0 }, '#fff', 24)
    expect(first.id).not.toBe(second.id)
  })

  it('moves without changing anything else about it', () => {
    const moved = moveLayer(layer(), 15, -25)
    expect(moved.x).toBe(115)
    expect(moved.y).toBe(75)
    expect(moved.text, 'moving must not rewrite the words').toBe('Hello')
    expect(moved.size).toBe(24)
  })

  it('replaces one text in place, leaving its neighbours alone', () => {
    const all = [layer(), layer({ id: 'text-2', text: 'World' })]
    const next = replaceLayer(all, layer({ text: 'Changed' }))
    expect(next[0]?.text).toBe('Changed')
    expect(next[1]?.text, 'the other text is untouched').toBe('World')
  })

  it('drops the one asked for and keeps the rest', () => {
    const all = [layer(), layer({ id: 'text-2' })]
    expect(dropLayer(all, 'text-1').map((item) => item.id)).toEqual(['text-2'])
  })

  it('discards texts nobody typed into', () => {
    const all = [layer(), layer({ id: 'text-2', text: '   ' })]
    expect(withoutEmpty(all).map((item) => item.id)).toEqual(['text-1'])
  })
})

describe('clicking a text picks it up rather than starting a new one', () => {
  it('finds the text under the pointer', () => {
    const all = [layer()]
    const bounds = layerBounds(all[0] as TextLayer, measure)
    const inside = { x: bounds.x + 5, y: bounds.y + 5 }
    expect(layerAt(all, inside, measure)?.id).toBe('text-1')
  })

  it('returns nothing when the pointer is on bare canvas', () => {
    expect(layerAt([layer()], { x: 900, y: 900 }, measure)).toBeNull()
  })

  it('prefers the topmost text when two overlap', () => {
    const all = [layer(), layer({ id: 'text-2' })]
    const bounds = layerBounds(all[0] as TextLayer, measure)
    const hit = layerAt(all, { x: bounds.x + 2, y: bounds.y + 2 }, measure)
    expect(hit?.id, 'the last one drawn sits on top').toBe('text-2')
  })
})
