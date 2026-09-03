import { type RefObject, useEffect, useRef } from 'react'
import { clampDayWidth, type ScheduleScale } from './schedule-scale'
import type { TimelineGrid } from './timeline-grid'
import { dayIndex } from './timeline-grid'

export type ScrollToDayOptions = {
  viewport: RefObject<HTMLElement | null>
  grid: TimelineGrid
  dayWidth: number
  now: Date
  scale: ScheduleScale
}

export type ZoomGestureOptions = {
  target: RefObject<HTMLElement | null>
  enabled: boolean
  dayWidth: number
  onDayWidth: (next: number) => void
}

export const ZOOM_GESTURE_FACTOR = 1.12

export function centeredScrollLeft(
  index: number,
  dayWidth: number,
  clientWidth: number,
  maxScroll: number,
): number {
  const centred = index * dayWidth - clientWidth / 2 + dayWidth / 2
  return Math.min(Math.max(0, centred), Math.max(0, maxScroll))
}

export function zoomAround(
  dayWidth: number,
  factor: number,
  scrollLeft: number,
  pointerX: number,
): { dayWidth: number; scrollLeft: number } {
  const next = clampDayWidth(dayWidth * factor)
  const ratio = next / dayWidth
  return { dayWidth: next, scrollLeft: (scrollLeft + pointerX) * ratio - pointerX }
}

export function useScrollToDay({ viewport, grid, dayWidth, now, scale }: ScrollToDayOptions) {
  const signature = `${scale}:${grid.start.getTime()}:${now.getTime()}`
  const lastRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const element = viewport.current
    if (!element || lastRef.current === signature) return
    lastRef.current = signature

    const index = dayIndex(grid, now)
    if (index < 0 || index >= grid.dayCount) return

    element.scrollLeft = centeredScrollLeft(
      index,
      dayWidth,
      element.clientWidth,
      element.scrollWidth - element.clientWidth,
    )
  }, [viewport, grid, dayWidth, now, signature])
}

export function useZoomGesture({ target, enabled, dayWidth, onDayWidth }: ZoomGestureOptions) {
  useEffect(() => {
    const element = target.current
    if (!element || !enabled) return

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()

      const factor = event.deltaY < 0 ? ZOOM_GESTURE_FACTOR : 1 / ZOOM_GESTURE_FACTOR
      const rect = element.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const result = zoomAround(dayWidth, factor, element.scrollLeft, pointerX)

      onDayWidth(result.dayWidth)
      element.scrollLeft = result.scrollLeft
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [target, enabled, dayWidth, onDayWidth])
}
