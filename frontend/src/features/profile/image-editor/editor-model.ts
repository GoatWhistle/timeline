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
  'fill',
  'picker',
  'rectangle',
  'ellipse',
  'line',
  'text',
]

export const BRUSH_SIZES = [2, 6, 12, 24] as const

export const TEXT_SIZES = [16, 24, 36, 56] as const

export type PaletteSwatch = { key: string; token: string }

export const EDITOR_PALETTE: PaletteSwatch[] = [
  { key: 'ink', token: 'var(--sunlit-ink)' },
  { key: 'graphite', token: 'var(--linear-graphite)' },
  { key: 'steel', token: 'var(--linear-steel)' },
  { key: 'fog', token: 'var(--linear-fog)' },
  { key: 'mist', token: 'var(--linear-mist)' },
  { key: 'paper', token: 'var(--neutral-000)' },
  { key: 'crimson', token: 'var(--hue-crimson-500)' },
  { key: 'red', token: 'var(--hue-red-500)' },
  { key: 'orange', token: 'var(--hue-orange-500)' },
  { key: 'amber', token: 'var(--hue-amber-500)' },
  { key: 'gold', token: 'var(--hue-gold-500)' },
  { key: 'bronze', token: 'var(--hue-bronze-500)' },
  { key: 'green', token: 'var(--hue-green-500)' },
  { key: 'teal', token: 'var(--hue-teal-500)' },
  { key: 'blue', token: 'var(--hue-blue-500)' },
  { key: 'brandBlue', token: 'var(--brand-blue-500)' },
  { key: 'violet', token: 'var(--hue-violet-500)' },
  { key: 'magenta', token: 'var(--hue-magenta-500)' },
  { key: 'crimsonLight', token: 'var(--hue-crimson-300)' },
  { key: 'redLight', token: 'var(--hue-red-300)' },
  { key: 'orangeLight', token: 'var(--hue-orange-300)' },
  { key: 'amberLight', token: 'var(--hue-amber-300)' },
  { key: 'goldLight', token: 'var(--hue-gold-300)' },
  { key: 'bronzeLight', token: 'var(--hue-bronze-300)' },
  { key: 'greenLight', token: 'var(--hue-green-300)' },
  { key: 'tealLight', token: 'var(--hue-teal-300)' },
  { key: 'blueLight', token: 'var(--hue-blue-300)' },
  { key: 'brandBlueLight', token: 'var(--brand-blue-300)' },
  { key: 'violetLight', token: 'var(--hue-violet-300)' },
  { key: 'magentaLight', token: 'var(--hue-magenta-300)' },
  { key: 'sand', token: 'var(--sunlit-sand)' },
  { key: 'clay', token: 'var(--sunlit-clay)' },
]

export const EDITOR_PALETTE_FALLBACK_HEX = '#111827'

export const MAX_EDIT_DIMENSION = 1024

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const CROP_HANDLES: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export const MIN_CROP_SIDE = 24

export function resizeCropByHandle(rect: Rect, handle: CropHandle, to: Point): Rect {
  const left = rect.x
  const top = rect.y
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  const movesLeft = handle.includes('w')
  const movesRight = handle.includes('e')
  const movesTop = handle.includes('n')
  const movesBottom = handle.includes('s')

  const anchorX = movesLeft ? right : left
  const anchorY = movesTop ? bottom : top

  const reachX = movesLeft || movesRight ? Math.abs(to.x - anchorX) : rect.width
  const reachY = movesTop || movesBottom ? Math.abs(to.y - anchorY) : rect.height
  const side = Math.max(MIN_CROP_SIDE, Math.max(reachX, reachY))

  return {
    x: movesLeft ? anchorX - side : anchorX,
    y: movesTop ? anchorY - side : anchorY,
    width: side,
    height: side,
  }
}

export function clampSquareTo(rect: Rect, width: number, height: number): Rect {
  const side = Math.min(rect.width, width, height)
  const x = Math.max(0, Math.min(rect.x, width - side))
  const y = Math.max(0, Math.min(rect.y, height - side))
  return { x, y, width: side, height: side }
}

export function moveRectBy(rect: Rect, dx: number, dy: number): Rect {
  return { x: rect.x + dx, y: rect.y + dy, width: rect.width, height: rect.height }
}

export function centredSquareIn(width: number, height: number): Rect {
  const side = Math.min(width, height)
  return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side }
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
