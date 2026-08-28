const FALLBACK_RATIO = 0.55

let context: CanvasRenderingContext2D | null | undefined

function canvasContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context
  if (typeof document === 'undefined') {
    context = null
    return context
  }
  context = document.createElement('canvas').getContext('2d')
  return context
}

export function measureText(text: string, font: string): number {
  if (!text) return 0
  const ctx = canvasContext()
  if (!ctx) return estimateText(text, fontSizeOf(font))
  ctx.font = font
  const measured = ctx.measureText(text).width
  return measured > 0 ? measured : estimateText(text, fontSizeOf(font))
}

export function estimateText(text: string, fontSize: number): number {
  return text.length * fontSize * FALLBACK_RATIO
}

export function fontSizeOf(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font)
  return match ? Number.parseFloat(match[1] ?? '') || 12 : 12
}

export function resetMeasureCache() {
  context = undefined
}
