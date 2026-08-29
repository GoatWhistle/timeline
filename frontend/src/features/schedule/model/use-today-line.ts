import { type RefObject, useCallback, useEffect, useRef } from 'react'
import type { CalendarGrid } from './calendar-grid'
import { dayIndex } from './calendar-grid'
import { type ScheduleScale, TODAY_TICK_MS, TODAY_VARIABLE } from './schedule-scale'

export type TodayLineOptions = {
  target: RefObject<HTMLElement | null>
  scale: ScheduleScale
  grid: CalendarGrid
  onVisibilityChange?: (visible: boolean) => void
}

export function useTodayLine({ target, scale, grid, onVisibilityChange }: TodayLineOptions) {
  const visibleRef = useRef(false)
  const notifyRef = useRef(onVisibilityChange)
  notifyRef.current = onVisibilityChange

  const write = useCallback(() => {
    const element = target.current
    if (!element) return
    const index = dayIndex(grid, new Date())
    const inside = index >= 0 && index < grid.dayCount
    element.style.setProperty(TODAY_VARIABLE, `${index}`)
    element.dataset.todayVisible = inside ? 'true' : 'false'
    if (inside !== visibleRef.current) {
      visibleRef.current = inside
      notifyRef.current?.(inside)
    }
  }, [target, grid])

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
      timer = setInterval(tick, TODAY_TICK_MS[scale])
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
  }, [target, scale])

  useEffect(write, [write])
}
