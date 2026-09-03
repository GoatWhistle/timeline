import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { TODAY_TICK_MS, TODAY_VARIABLE } from './schedule-scale'
import type { TimelineGrid } from './timeline-grid'
import { dayIndex } from './timeline-grid'

export type TodayLineOptions = {
  target: RefObject<HTMLElement | null>
  grid: TimelineGrid
  dayWidth: number
  onVisibilityChange?: (visible: boolean) => void
}

export function useTodayLine({ target, grid, dayWidth, onVisibilityChange }: TodayLineOptions) {
  const visibleRef = useRef(false)
  const notifyRef = useRef(onVisibilityChange)
  notifyRef.current = onVisibilityChange

  const write = useCallback(() => {
    const element = target.current
    if (!element) return
    const now = new Date()
    const index = dayIndex(grid, now)
    const inside = index >= 0 && index < grid.dayCount
    const fraction = (now.getHours() * 60 + now.getMinutes()) / 1440

    element.style.setProperty(TODAY_VARIABLE, `${(index + fraction) * dayWidth}px`)
    element.dataset.todayVisible = inside ? 'true' : 'false'

    if (inside !== visibleRef.current) {
      visibleRef.current = inside
      notifyRef.current?.(inside)
    }
  }, [target, grid, dayWidth])

  const writeRef = useRef(write)
  writeRef.current = write

  useEffect(() => {
    if (!target.current) return

    let timer: ReturnType<typeof setInterval> | undefined
    const tick = () => writeRef.current()

    const stop = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    }

    const start = () => {
      stop()
      tick()
      timer = setInterval(tick, TODAY_TICK_MS)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (document.hidden) tick()
    else start()

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [target])

  useEffect(write, [write])
}
