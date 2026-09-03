export type NavigationAction =
  | { type: 'move'; index: number }
  | { type: 'today' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'open' }
  | { type: 'moment'; delta: 1 | -1 }
  | { type: 'openMoment' }
  | { type: 'scroll'; delta: 1 | -1; page: boolean }

export type NavigableSpan = {
  id: string
  startDay: number
  lane: number
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
      return { type: 'move', index: laneMove(spans, current, 1) }
    case 'ArrowUp':
      return { type: 'move', index: laneMove(spans, current, -1) }
    case 'Home':
      return { type: 'move', index: 0 }
    case 'End':
      return { type: 'move', index: Math.max(0, spans.length - 1) }
    case 'Enter':
      return { type: 'open' }
    case 'PageDown':
      return { type: 'scroll', delta: 1, page: true }
    case 'PageUp':
      return { type: 'scroll', delta: -1, page: true }
    case 'n':
    case 'N':
      return { type: 'moment', delta: 1 }
    case 'p':
    case 'P':
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

function laneMove(spans: readonly NavigableSpan[], index: number, delta: number): number {
  const anchor = spans[index]
  if (!anchor) return index

  const candidates = spans.filter((span) =>
    delta > 0 ? span.lane > anchor.lane : span.lane < anchor.lane,
  )
  if (candidates.length === 0) return index

  const nearestLane = candidates.reduce((best, span) =>
    Math.abs(span.lane - anchor.lane) < Math.abs(best.lane - anchor.lane) ? span : best,
  )
  const sameLane = candidates.filter((span) => span.lane === nearestLane.lane)
  const nearest = sameLane[nearestSpanByDay(sameLane, anchor.startDay)]

  const found = nearest ? spans.findIndex((span) => span.id === nearest.id) : -1
  return found === -1 ? index : found
}
