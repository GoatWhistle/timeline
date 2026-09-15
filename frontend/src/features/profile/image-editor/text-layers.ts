import type { Point, Rect } from './editor-model'

export type TextLayer = {
  id: string
  x: number
  y: number
  text: string
  colour: string
  size: number
}

export function newTextLayer(point: Point, colour: string, size: number): TextLayer {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x: point.x,
    y: point.y,
    text: '',
    colour,
    size,
  }
}

export function moveLayer(layer: TextLayer, dx: number, dy: number): TextLayer {
  return { ...layer, x: layer.x + dx, y: layer.y + dy }
}

export function layerBounds(
  layer: TextLayer,
  measure: (text: string, size: number) => number,
): Rect {
  const width = measure(layer.text, layer.size)
  const lines = layer.text.split('\n').length
  return { x: layer.x, y: layer.y, width, height: layer.size * 1.3 * lines }
}

export function layerAt(
  layers: readonly TextLayer[],
  point: Point,
  measure: (text: string, size: number) => number,
): TextLayer | null {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (!layer) continue
    const bounds = layerBounds(layer, measure)
    if (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ) {
      return layer
    }
  }
  return null
}

export function replaceLayer(layers: readonly TextLayer[], next: TextLayer): TextLayer[] {
  return layers.map((layer) => (layer.id === next.id ? next : layer))
}

export function dropLayer(layers: readonly TextLayer[], id: string): TextLayer[] {
  return layers.filter((layer) => layer.id !== id)
}

export function withoutEmpty(layers: readonly TextLayer[]): TextLayer[] {
  return layers.filter((layer) => layer.text.trim() !== '')
}
