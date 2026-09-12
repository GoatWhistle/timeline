export type EditorTool =
  | 'crop'
  | 'brush'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'fill'
  | 'picker'
  | 'text'

export type Point = { x: number; y: number }

export type Rect = { x: number; y: number; width: number; height: number }

export const EDITOR_TOOLS: EditorTool[] = [
  'crop',
  'brush',
  'rectangle',
  'ellipse',
  'line',
  'fill',
  'text',
  'picker',
]

export const BRUSH_SIZES = [2, 6, 12, 24] as const

export const TEXT_SIZES = [16, 24, 36, 56] as const

export type PaletteSwatch = { key: string; token: string }

export const EDITOR_PALETTE: PaletteSwatch[] = [
  { key: 'ink', token: 'var(--sunlit-ink)' },
  { key: 'paper', token: 'var(--neutral-000)' },
  { key: 'red', token: 'var(--hue-red-500)' },
  { key: 'amber', token: 'var(--hue-amber-500)' },
  { key: 'green', token: 'var(--hue-green-500)' },
  { key: 'blue', token: 'var(--hue-blue-500)' },
  { key: 'violet', token: 'var(--hue-violet-500)' },
  { key: 'magenta', token: 'var(--hue-magenta-500)' },
]

export const EDITOR_PALETTE_FALLBACK_HEX = '#111827'

export const MAX_EDIT_DIMENSION = 1024

export const MIN_CROP_ZOOM = 1
export const MAX_CROP_ZOOM = 3

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

export const CROP_HANDLES: CropHandle[] = ['nw', 'ne', 'sw', 'se']

export function clampCropZoom(value: number): number {
  return Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, value))
}

export function resizeCropByHandle(rect: Rect, handle: CropHandle, to: Point): Rect {
  const opposite: Record<CropHandle, Point> = {
    nw: { x: rect.x + rect.width, y: rect.y + rect.height },
    ne: { x: rect.x, y: rect.y + rect.height },
    sw: { x: rect.x + rect.width, y: rect.y },
    se: { x: rect.x, y: rect.y },
  }
  return normaliseRect(opposite[handle], to)
}

export function normaliseRect(from: Point, to: Point): Rect {
  const x = Math.min(from.x, to.x)
  const y = Math.min(from.y, to.y)
  return { x, y, width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) }
}

export function clampRectTo(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(rect.x, width))
  const y = Math.max(0, Math.min(rect.y, height))
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width, width - x)),
    height: Math.max(0, Math.min(rect.height, height - y)),
  }
}

export function isUsableCrop(rect: Rect): boolean {
  return rect.width >= 1 && rect.height >= 1
}

export function fitWithin(width: number, height: number, limit: number): [number, number] {
  const longest = Math.max(width, height)
  if (longest <= limit) return [width, height]
  const scale = limit / longest
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))]
}

export function toRgba(hex: string): [number, number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
    255,
  ]
}

export function toHex(r: number, g: number, b: number): string {
  const part = (n: number) => n.toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isValidHexColour(value: string): boolean {
  return HEX_COLOUR.test(value.trim())
}

export function normaliseHexColour(value: string): string | null {
  const trimmed = value.trim()
  if (!isValidHexColour(trimmed)) return null
  const [r, g, b] = toRgba(trimmed)
  return toHex(r, g, b)
}
