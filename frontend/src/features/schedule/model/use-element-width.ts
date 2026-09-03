import { type RefObject, useEffect, useState } from 'react'

export function useElementWidth(target: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = target.current
    if (!element) return

    const read = () => setWidth(element.clientWidth)
    read()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }

    const observer = new ResizeObserver(read)
    observer.observe(element)
    return () => observer.disconnect()
  }, [target])

  return width
}
