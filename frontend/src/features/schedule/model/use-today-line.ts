import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { type ScheduleScale, TODAY_TICK_MS, TODAY_VARIABLE } from './schedule-scale'

export type TodayLineOptions = {
  target: RefObject<HTMLElement | null>
  scale: ScheduleScale
  x: (date: Date) => number
  width: number
  onVisibilityChange?: (visible: boolean) => void
}

export function useTodayLine({ target, scale, x, width, onVisibilityChange }: TodayLineOptions) {
  const visibleRef = useRef(false)
  const notifyRef = useRef(onVisibilityChange)
  notifyRef.current = onVisibilityChange

  const write = useCallback(() => {
    const element = target.current
    if (!element) return
    const position = x(new Date())
    const inside = position >= 0 && position <= width
    element.style.setProperty(TODAY_VARIABLE, `${position}px`)
    element.dataset.todayVisible = inside ? 'true' : 'false'
    if (inside !== visibleRef.current) {
      visibleRef.current = inside
      notifyRef.current?.(inside)
    }
  }, [target, x, width])

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
