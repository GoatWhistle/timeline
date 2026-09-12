import {
  EDITOR_PALETTE_FALLBACK_HEX,
  type EditorTool,
  type Point,
  type Rect,
  toHex,
} from './editor-model'
import { floodFill, pixelAt } from './flood-fill'

export function resolveColourToken(token: string): string {
  if (typeof document === 'undefined') return EDITOR_PALETTE_FALLBACK_HEX
  const probe = document.createElement('span')
  probe.style.color = token
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  document.body.removeChild(probe)
  if (resolved === '' || resolved === 'rgba(0, 0, 0, 0)') return EDITOR_PALETTE_FALLBACK_HEX

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) return EDITOR_PALETTE_FALLBACK_HEX
  context.fillStyle = resolved
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  if (r === undefined || g === undefined || b === undefined) return EDITOR_PALETTE_FALLBACK_HEX
  return toHex(r, g, b)
}

export function strokeSettings(
  context: CanvasRenderingContext2D,
  colour: string,
  size: number,
): void {
  context.strokeStyle = colour
  context.fillStyle = colour
  context.lineWidth = size
  context.lineCap = 'round'
  context.lineJoin = 'round'
}

export function drawBrushSegment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  colour: string,
  size: number,
): void {
  strokeSettings(context, colour, size)
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

export function drawShape(
  context: CanvasRenderingContext2D,
  tool: EditorTool,
  from: Point,
  to: Point,
  colour: string,
  size: number,
): void {
  strokeSettings(context, colour, size)
  if (tool === 'line') {
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
    return
  }
  if (tool === 'rectangle') {
    context.beginPath()
    context.rect(from.x, from.y, to.x - from.x, to.y - from.y)
    context.stroke()
    return
  }
  if (tool === 'ellipse') {
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2
    context.beginPath()
    context.ellipse(
      cx,
      cy,
      Math.abs(to.x - from.x) / 2,
      Math.abs(to.y - from.y) / 2,
      0,
      0,
      Math.PI * 2,
    )
    context.stroke()
  }
}

export function drawText(
  context: CanvasRenderingContext2D,
  point: Point,
  text: string,
  colour: string,
  size: number,
): void {
  context.fillStyle = colour
  context.font = `${size}px sans-serif`
  context.textBaseline = 'top'
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    context.fillText(line, point.x, point.y + index * size * 1.2)
  })
}

export function applyFill(
  context: CanvasRenderingContext2D,
  point: Point,
  colour: string,
): boolean {
  const { width, height } = context.canvas
  if (width === 0 || height === 0) return false
  const image = context.getImageData(0, 0, width, height)
  const changed = floodFill(
    image.data,
    width,
    height,
    Math.round(point.x),
    Math.round(point.y),
    colour,
  )
  if (changed) context.putImageData(image, 0, 0)
  return changed
}

export function pickColour(context: CanvasRenderingContext2D, point: Point): string | null {
  const { width, height } = context.canvas
  const x = Math.round(point.x)
  const y = Math.round(point.y)
  if (x < 0 || y < 0 || x >= width || y >= height) return null
  const image = context.getImageData(x, y, 1, 1)
  const [r, g, b] = pixelAt(image.data, 1, 0, 0)
  return toHex(r, g, b)
}

export function cropCanvas(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement | null {
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (width < 1 || height < 1) return null

  const target = document.createElement('canvas')
  target.width = width
  target.height = height
  const context = target.getContext('2d')
  if (!context) return null
  context.drawImage(
    source,
    Math.round(rect.x),
    Math.round(rect.y),
    width,
    height,
    0,
    0,
    width,
    height,
  )
  return target
}

export function pointerPosition(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point {
  const bounds = canvas.getBoundingClientRect()
  const scaleX = bounds.width === 0 ? 1 : canvas.width / bounds.width
  const scaleY = bounds.height === 0 ? 1 : canvas.height / bounds.height
  return {
    x: (clientX - bounds.left) * scaleX,
    y: (clientY - bounds.top) * scaleY,
  }
}
