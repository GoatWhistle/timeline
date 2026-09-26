import { type RefObject, useLayoutEffect, useRef } from 'react'

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? fallback : value
}

function milliseconds(value: string): number {
  const amount = Number.parseFloat(value)
  if (Number.isNaN(amount)) return 0
  return value.endsWith('ms') ? amount : amount * 1000
}

export function useFollowSidebar(target: RefObject<HTMLElement | null>, collapsed: boolean) {
  const lastLeft = useRef<number | null>(null)
  const lastCollapsed = useRef(collapsed)

  useLayoutEffect(() => {
    const element = target.current
    if (element === null) return
    const left =
      element.getBoundingClientRect().left +
      (Number.parseFloat(getComputedStyle(element).paddingLeft) || 0)
    const moved = lastCollapsed.current !== collapsed
    const from = lastLeft.current
    lastCollapsed.current = collapsed
    lastLeft.current = left
    if (!moved || from === null || from === left) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof element.animate !== 'function') return
    element.animate(
      [{ transform: `translateX(${from - left}px)` }, { transform: 'translateX(0)' }],
      {
        duration: milliseconds(token('--duration-base', '200ms')),
        easing: token('--ease-out', 'ease-out'),
      },
    )
  })
}
