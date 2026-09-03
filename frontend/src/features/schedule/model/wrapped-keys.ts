import { DAYS_PER_WEEK } from './pack-lanes'

export type WrappedKeyAction =
  | { type: 'move'; days: number }
  | { type: 'edge'; to: 'first' | 'last' }
  | { type: 'today' }
  | { type: 'enterBars' }
  | { type: 'leaveBars' }
  | { type: 'stepBar'; delta: 1 | -1 }
  | { type: 'clear' }
  | { type: 'open' }

const DAY_MOVES: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: DAYS_PER_WEEK,
  ArrowUp: -DAYS_PER_WEEK,
}

export function resolveDayKey(key: string): WrappedKeyAction | undefined {
  if (key in DAY_MOVES) return { type: 'move', days: DAY_MOVES[key] ?? 0 }
  if (key === 'Home') return { type: 'edge', to: 'first' }
  if (key === 'End') return { type: 'edge', to: 'last' }
  if (key === 't' || key === 'T') return { type: 'today' }
  if (key === 'Enter' || key === ' ' || key === 'Spacebar') return { type: 'enterBars' }
  if (key === 'Escape') return { type: 'clear' }
  return undefined
}

export function resolveBarKey(key: string): WrappedKeyAction | undefined {
  if (key === 'Enter') return { type: 'open' }
  if (key === 'Escape') return { type: 'leaveBars' }
  if (key === 'ArrowRight' || key === 'ArrowDown') return { type: 'stepBar', delta: 1 }
  if (key === 'ArrowLeft' || key === 'ArrowUp') return { type: 'stepBar', delta: -1 }
  return undefined
}
