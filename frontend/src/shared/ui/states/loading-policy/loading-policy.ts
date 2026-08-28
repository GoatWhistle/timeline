export const SKELETON_DELAY_MS = 200
export const SPINNER_DELAY_MS = 400
export const SKELETON_MIN_MS = 300

export type LoadingShape = 'known' | 'unknown'

export type LoadingIndicator = 'none' | 'skeleton' | 'spinner' | 'stale'

export type LoadingInput = {
  isPending: boolean
  isFetching?: boolean
  hasData?: boolean
  shape?: LoadingShape
  elapsedMs: number
  shownSinceMs?: number | null
}

export function decideIndicator({
  isPending,
  isFetching = false,
  hasData = false,
  shape = 'known',
  elapsedMs,
  shownSinceMs = null,
}: LoadingInput): LoadingIndicator {
  if (hasData) return isFetching ? 'stale' : 'none'

  if (!isPending) {
    if (shownSinceMs !== null && shownSinceMs < SKELETON_MIN_MS) {
      return shape === 'known' ? 'skeleton' : 'spinner'
    }
    return 'none'
  }

  if (shape === 'known') return elapsedMs >= SKELETON_DELAY_MS ? 'skeleton' : 'none'
  return elapsedMs >= SPINNER_DELAY_MS ? 'spinner' : 'none'
}

export function holdUntil(shownAtMs: number, resolvedAtMs: number): number {
  const shownFor = resolvedAtMs - shownAtMs
  return shownFor >= SKELETON_MIN_MS ? 0 : SKELETON_MIN_MS - shownFor
}
