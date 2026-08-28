import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/shared/hooks/use-prefers-reduced-motion/use-prefers-reduced-motion'
import type { ScheduleScale } from './schedule-scale'
import {
  clampToBounds,
  easeZoom,
  interpolateRange,
  type Range,
  rangeAround,
  scaleSpanMs,
} from './zoom-range'

export const ZOOM_DURATION = 260

export type ZoomRangeOptions = {
  bounds: Range
  scale: ScheduleScale
  focus: number
  duration?: number
}

function targetRange({ bounds, scale, focus }: ZoomRangeOptions): Range {
  return clampToBounds(rangeAround(focus, scaleSpanMs(scale)), bounds)
}

export function useZoomRange(options: ZoomRangeOptions): Range {
  const reducedMotion = usePrefersReducedMotion()
  const duration = options.duration ?? ZOOM_DURATION
  const target = targetRange(options)
  const [range, setRange] = useState<Range>(target)
  const rangeRef = useRef(range)
  const frameRef = useRef<number | undefined>(undefined)

  rangeRef.current = range

  const targetFrom = target.from
  const targetTo = target.to

  useEffect(() => {
    const from = rangeRef.current
    const to = { from: targetFrom, to: targetTo }
    if (from.from === to.from && from.to === to.to) return

    if (reducedMotion || duration <= 0) {
      setRange(to)
      return
    }

    const startedAt = performance.now()

    const step = () => {
      const elapsed = performance.now() - startedAt
      const progress = Math.min(1, elapsed / duration)
      setRange(interpolateRange(from, to, easeZoom(progress)))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
  }, [targetFrom, targetTo, duration, reducedMotion])

  return range
}
