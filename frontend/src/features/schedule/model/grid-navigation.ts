import { DAYS_PER_WEEK } from './pack-lanes'

export type NavigationAction =
  | { type: 'move'; index: number }
  | { type: 'today' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'open' }
  | { type: 'moment'; delta: 1 | -1 }
  | { type: 'openMoment' }

export type NavigableSpan = {
  id: string
  startDay: number
}

export function clampIndex(spans: readonly NavigableSpan[], index: number): number {
  if (spans.length === 0) return 0
  return Math.min(Math.max(index, 0), spans.length - 1)
}

export function nearestSpanByDay(spans: readonly NavigableSpan[], day: number): number {
  if (spans.length === 0) return 0
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [index, span] of spans.entries()) {
    const distance = Math.abs(span.startDay - day)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  }
  return best
}

export function resolveKey(
  key: string,
  spans: readonly NavigableSpan[],
  index: number,
): NavigationAction | undefined {
  const current = clampIndex(spans, index)

  switch (key) {
    case 'ArrowRight':
      return { type: 'move', index: clampIndex(spans, current + 1) }
    case 'ArrowLeft':
      return { type: 'move', index: clampIndex(spans, current - 1) }
    case 'ArrowDown':
      return { type: 'move', index: weekMove(spans, current, 1) }
    case 'ArrowUp':
      return { type: 'move', index: weekMove(spans, current, -1) }
    case 'Home':
      return { type: 'move', index: 0 }
    case 'End':
      return { type: 'move', index: Math.max(0, spans.length - 1) }
    case 'Enter':
      return { type: 'open' }
    case 'PageDown':
      return { type: 'moment', delta: 1 }
    case 'PageUp':
      return { type: 'moment', delta: -1 }
    case ' ':
    case 'Spacebar':
      return { type: 'openMoment' }
    case 't':
    case 'T':
      return { type: 'today' }
    case '+':
    case '=':
      return { type: 'zoomIn' }
    case '-':
    case '_':
      return { type: 'zoomOut' }
    default:
      return undefined
  }
}

function weekMove(spans: readonly NavigableSpan[], index: number, delta: number): number {
  const anchor = spans[index]
  if (!anchor) return index
  const target = anchor.startDay + delta * DAYS_PER_WEEK
  const candidates = spans.filter((span) =>
    delta > 0 ? span.startDay > anchor.startDay : span.startDay < anchor.startDay,
  )
  if (candidates.length === 0) return index
  const nearest = candidates[nearestSpanByDay(candidates, target)]
  const found = nearest ? spans.findIndex((span) => span.id === nearest.id) : -1
  return found === -1 ? index : found
}
