import { LABEL_OUTSIDE_GAP } from './schedule-scale'

export type LabelPlacement = 'inside' | 'outside' | 'hidden'

export type LabelLayout = {
  placement: LabelPlacement
  offset: number
}

export type LabelInput = {
  left: number
  width: number
  textWidth: number
  padding?: number
  canvasWidth?: number
  gap?: number
  spaceAfter?: number
}

export const LABEL_PADDING = 8

export function placeBarLabel({
  left,
  width,
  textWidth,
  padding = LABEL_PADDING,
  canvasWidth = Number.POSITIVE_INFINITY,
  gap = LABEL_OUTSIDE_GAP,
  spaceAfter = Number.POSITIVE_INFINITY,
}: LabelInput): LabelLayout {
  if (textWidth <= 0) return { placement: 'inside', offset: 0 }

  if (textWidth + padding * 2 <= width) {
    const visibleLeft = Math.max(left, 0)
    const visibleRight = Math.min(left + width, canvasWidth)
    const visible = visibleRight - visibleLeft
    if (visible >= textWidth + padding * 2) {
      const centered = visibleLeft + (visible - textWidth) / 2 - left
      return { placement: 'inside', offset: clampInside(centered, width, textWidth, padding) }
    }
    return { placement: 'inside', offset: clampInside(0, width, textWidth, padding) }
  }

  if (spaceAfter < gap + textWidth) return { placement: 'hidden', offset: width + gap }

  return { placement: 'outside', offset: width + gap }
}

function clampInside(offset: number, width: number, textWidth: number, padding: number): number {
  const max = width - textWidth - padding
  return Math.min(Math.max(offset, padding), Math.max(padding, max))
}

export function spaceAfterOnLane(
  index: number,
  lane: number,
  placements: readonly { left: number; width: number; lane: number }[],
  canvasWidth: number,
): number {
  const current = placements[index]
  if (!current) return canvasWidth
  const right = current.left + current.width
  let nearest = canvasWidth

  for (const [other, candidate] of placements.entries()) {
    if (other === index || candidate.lane !== lane) continue
    if (candidate.left >= right && candidate.left < nearest) nearest = candidate.left
  }

  return Math.max(0, nearest - right)
}
