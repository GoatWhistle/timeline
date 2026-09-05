import { type RefObject, useEffect, useState } from 'react'

export function useRoomBelow(target: RefObject<HTMLElement | null>): number {
  const [room, setRoom] = useState(0)

  useEffect(() => {
    const element = target.current
    if (!element) return

    const read = () => {
      const top = element.getBoundingClientRect().top
      const bar = document.querySelector('[data-bottom-nav]')
      const taken = bar ? bar.getBoundingClientRect().height : 0
      setRoom(Math.max(0, Math.round(window.innerHeight - top - taken)))
    }
    read()

    window.addEventListener('resize', read)
    window.addEventListener('orientationchange', read)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', read)
        window.removeEventListener('orientationchange', read)
      }
    }

    const observer = new ResizeObserver(read)
    observer.observe(document.documentElement)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', read)
      window.removeEventListener('orientationchange', read)
    }
  }, [target])

  return room
}
