import { useRef } from 'react'
import type { SwapDirection } from '../ui/view-swap/view-swap'
import type { ScheduleScale } from './schedule-scale'

export function swapDirection(
  previous: { scale: ScheduleScale; offset: number } | undefined,
  next: { scale: ScheduleScale; offset: number },
): SwapDirection {
  if (!previous) return 'scale'
  if (previous.scale !== next.scale) return 'scale'
  if (next.offset > previous.offset) return 'forward'
  if (next.offset < previous.offset) return 'back'
  return 'scale'
}

export function useSwapDirection(scale: ScheduleScale, offset: number): SwapDirection {
  const seen = useRef<{ scale: ScheduleScale; offset: number } | undefined>(undefined)
  const settled = useRef<SwapDirection>('scale')

  if (!seen.current || seen.current.scale !== scale || seen.current.offset !== offset) {
    settled.current = swapDirection(seen.current, { scale, offset })
    seen.current = { scale, offset }
  }

  return settled.current
}
